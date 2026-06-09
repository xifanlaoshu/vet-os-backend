import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { paginate } from '~/helper/paginate'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
import { RxDetailEntity } from '../vpet-prescription/entities/rx-detail.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { LabInterpretDto, QueryAiLogDto, SoapDraftDto } from './dto/ai.dto'
import { AiLogEntity } from './entities/ai-log.entity'

const MDR1_BREEDS = ['边境牧羊犬', '喜乐蒂', '粗毛牧羊犬', 'shetland', 'collie', 'border collie']
const IVERMECTIN_KEYWORDS = ['伊维菌素', 'ivermectin']
const NSAID_KEYWORDS = ['美洛昔康', 'meloxicam', 'carprofen', '卡洛芬', 'firocoxib', '非罗考昔']
const STEROID_KEYWORDS = ['地塞米松', 'dexamethasone', '泼尼松', 'prednisone', 'prednisolone', '泼尼松龙']
const DOSE_RULES: Array<{ keywords: string[], mgPerKg: number }> = [
  { keywords: ['拜有利', '恩诺沙星', 'enrofloxacin'], mgPerKg: 5 },
  { keywords: ['阿莫西林', 'amoxicillin'], mgPerKg: 12.5 },
]

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiLogEntity)
    private aiLogRepository: Repository<AiLogEntity>,
    @InjectRepository(PrescriptionEntity)
    private prescriptionRepository: Repository<PrescriptionEntity>,
    @InjectRepository(RxDetailEntity)
    private rxDetailRepository: Repository<RxDetailEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
  ) {}

  async generateSoapDraft(dto: SoapDraftDto) {
    const subjective = dto.chiefComplaint
    const objective = dto.objectiveFindings || 'Pending physical examination and laboratory confirmation.'
    const assessment = dto.draftNotes
      ? `Primary concern: ${dto.draftNotes}. Differential diagnosis should be refined after examination.`
      : 'Preliminary assessment pending consultation and diagnostics.'
    const plan = 'Recommend focused physical exam, problem list review, diagnostics as needed, and owner communication.'

    const response = {
      subjective: {
        zh: `${dto.petName || '患宠'}主诉：${subjective}`,
        en: `${dto.petName || 'The pet'} presents with: ${subjective}`,
      },
      objective: {
        zh: `客观资料：${objective}`,
        en: `Objective findings: ${objective}`,
      },
      assessment: {
        zh: `初步评估：${assessment}`,
        en: `Initial assessment: ${assessment}`,
      },
      plan: {
        zh: `计划：${plan}`,
        en: `Plan: ${plan}`,
      },
    }

    await this.log('soap_draft', null, null, dto as any, response, [], 1)
    return response
  }

  async interpretLab(dto: LabInterpretDto) {
    const abnormalities = dto.items
      .map((item) => {
        const value = Number(item.resultValue)
        if (Number.isNaN(value) || item.refMin === undefined || item.refMax === undefined)
          return null
        if (value < Number(item.refMin))
          return { ...item, flag: 'L' }
        if (value > Number(item.refMax))
          return { ...item, flag: 'H' }
        return null
      })
      .filter(Boolean)

    const response = {
      abnormalCount: abnormalities.length,
      summaryForDoctor: abnormalities.length
        ? `Detected ${abnormalities.length} abnormal indicator(s). Correlate with symptoms and consider repeat or expanded tests.`
        : 'No obvious abnormal indicators from the provided items.',
      summaryForOwner: abnormalities.length
        ? 'Some test values are outside the usual range. The veterinarian should interpret them together with symptoms and physical findings.'
        : 'The provided test values are within the usual reference range.',
      abnormalities,
    }

    await this.log('lab_interpret', null, null, dto as any, response, abnormalities as any[], abnormalities.length ? 2 : 1)
    return response
  }

  async reviewPrescription(id: number) {
    const prescription = await this.prescriptionRepository.findOne({
      where: { id },
      relations: ['details'],
    })
    if (!prescription) {
      return null
    }

    const visit = await this.visitRepository.findOneBy({ id: prescription.visitId })
    const pet = visit?.petId ? await this.petRepository.findOneBy({ id: visit.petId }) : null
    const details = prescription.details || []
    const drugDetails = details.filter(detail => Number(detail.itemKind ?? (detail.drugId ? 1 : 2)) === 1)
    const serviceDetails = details.filter(detail => Number(detail.itemKind ?? (detail.drugId ? 1 : 2)) === 2)
    const warnings: Record<string, any>[] = []

    if (pet && this.isMdr1Breed(pet.breed)) {
      const riskyDrug = drugDetails.find(detail => this.matchesKeywords(detail.drugName, IVERMECTIN_KEYWORDS))
      if (riskyDrug) {
        warnings.push({
          ruleId: 'MDR1_IVERMECTIN_BLOCK',
          level: 3,
          message: 'Collie-line breeds may have severe ivermectin sensitivity. Dual sign-off is required.',
          drugName: riskyDrug.drugName,
        })
      }
    }

    const hasNsaid = drugDetails.some(detail => this.matchesKeywords(detail.drugName, NSAID_KEYWORDS))
    const hasSteroid = drugDetails.some(detail => this.matchesKeywords(detail.drugName, STEROID_KEYWORDS))
    if (hasNsaid && hasSteroid) {
      warnings.push({
        ruleId: 'NSAID_STEROID_BLOCK',
        level: 2,
        message: 'Concurrent NSAID and corticosteroid usage increases GI ulcer risk.',
      })
    }

    if (pet?.weight) {
      for (const detail of drugDetails) {
        const doseWarning = this.checkDoseByWeight(detail, Number(pet.weight))
        if (doseWarning)
          warnings.push(doseWarning)
      }
    }

    const riskLevel = warnings.reduce((max, item) => Math.max(max, Number(item.level || 1)), 1)
    const response = {
      riskLevel,
      requireDualSign: warnings.some(item => Number(item.level) >= 3),
      warnings,
      reviewedDrugItemCount: drugDetails.length,
      skippedServiceItemCount: serviceDetails.length,
      recommendation: warnings.length
        ? 'Please resolve highlighted safety issues before dispense.'
        : 'No high-risk issue detected by the local safety engine.',
    }

    await this.log('prescription_review', 'prescription', id, { prescriptionId: id }, response, warnings, riskLevel)
    return response
  }

  async logList(dto: QueryAiLogDto) {
    const { page = 1, pageSize = 10, taskType, bizType, bizId } = dto
    const qb = this.aiLogRepository.createQueryBuilder('log')
    if (taskType)
      qb.andWhere('log.taskType = :taskType', { taskType })
    if (bizType)
      qb.andWhere('log.bizType = :bizType', { bizType })
    if (bizId)
      qb.andWhere('log.bizId = :bizId', { bizId })
    qb.orderBy('log.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  private async log(
    taskType: string,
    bizType: string | null,
    bizId: number | null,
    requestPayload: Record<string, any>,
    responsePayload: Record<string, any>,
    warnings: Record<string, any>[],
    riskLevel: number,
  ) {
    await this.aiLogRepository.save(this.aiLogRepository.create({
      taskType,
      bizType: bizType ?? null,
      bizId: bizId ?? null,
      riskLevel,
      status: 1,
      requestPayload,
      responsePayload,
      warnings,
    }))
  }

  private isMdr1Breed(breed?: string) {
    const normalized = String(breed || '').toLowerCase()
    return MDR1_BREEDS.some(item => normalized.includes(item.toLowerCase()))
  }

  private matchesKeywords(text: string | undefined, keywords: string[]) {
    const normalized = String(text || '').toLowerCase()
    return keywords.some(keyword => normalized.includes(keyword.toLowerCase()))
  }

  private checkDoseByWeight(detail: RxDetailEntity, weight: number) {
    const dose = Number(detail.dosage)
    const quantity = Number(detail.quantity || 1)
    if (Number.isNaN(dose) || !weight)
      return null

    for (const rule of DOSE_RULES) {
      if (!this.matchesKeywords(detail.drugName, rule.keywords))
        continue
      const recommended = rule.mgPerKg * weight
      const totalDose = dose * quantity
      if (totalDose > recommended * 1.5 || totalDose < recommended * 0.5) {
        return {
          ruleId: 'WEIGHT_DOSE_WARN',
          level: 2,
          message: `Dose deviates from the reference ${rule.mgPerKg}mg/kg range.`,
          drugName: detail.drugName,
          expectedDose: recommended,
          actualDose: totalDose,
        }
      }
    }

    return null
  }
}
