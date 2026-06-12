import { MigrationInterface, QueryRunner } from 'typeorm'

const categoryRiskAppendix: Record<string, string> = {
  examination: '三、重点风险提示\n检查可能因疼痛、恐惧、攻击行为或基础疾病造成应激反应；检查结论受疾病阶段和配合度影响，必要时需复查或追加化验、影像、镇静检查。',
  lab: '三、重点风险提示\n采样可能出现疼痛、出血、淤青、感染、样本不足、结果假阴性或假阳性；外送检测还可能受物流、样本保存和实验室周期影响。',
  imaging: '三、重点风险提示\n影像检查可能需要保定、剃毛、改变体位或镇静；结果可能受肠气、肥胖、疼痛、配合度和设备条件影响，必要时需复查或转诊高级影像。',
  anesthesia: '三、重点风险提示\n麻醉和镇静存在呼吸抑制、循环抑制、呕吐误吸、低体温、苏醒延迟、过敏、心律异常甚至死亡风险；短鼻、幼龄、老年、心肺肝肾疾病、休克和贫血动物风险更高。',
  surgery: '三、重点风险提示\n手术可能发生麻醉意外、出血、感染、疼痛、组织坏死、伤口裂开、复发、术中方案调整、二次手术或死亡；术后护理不到位会明显增加并发症。',
  dental: '三、重点风险提示\n口腔治疗通常需要麻醉，可能发生牙龈出血、牙根断裂、口鼻瘘、下颌骨损伤、术后疼痛、感染、进食下降；术中拔牙数量可能多于术前判断。',
  hospitalization: '三、重点风险提示\n住院期间病情可能突变，可能需要追加检查、升级监护、调整用药、急救或转诊；住院环境可能导致应激、拒食、舔咬管路和伤口。',
  emergency: '三、重点风险提示\n急危重症具有高度不确定性，即使及时抢救仍可能出现多器官衰竭、心肺骤停和死亡；抢救项目和费用可能随病情快速变化。',
  treatment: '三、重点风险提示\n治疗处置可能出现药物过敏、局部疼痛肿胀、静脉炎、漏液、输液反应、呼吸循环负担或治疗反应不佳；心肾疾病、幼龄和老年动物需严密观察。',
  medication: '三、重点风险提示\n特殊用药可能存在超说明书使用、个体差异、药物相互作用、肝肾负担、胃肠反应、神经症状或血液学异常，需严格按医嘱给药并按期复查。',
  transfusion: '三、重点风险提示\n输血和血制品可能出现发热、过敏、溶血、容量负荷、感染传播、凝血异常或治疗无效；配血和监测只能降低风险，不能完全消除风险。',
  vaccination: '三、重点风险提示\n疫苗接种可能出现低热、精神食欲下降、注射部位疼痛、呕吐腹泻、过敏、休克；潜伏期疾病、免疫异常和应激状态可能影响免疫效果。',
  prevention: '三、重点风险提示\n驱虫和预防用药可能出现胃肠反应、皮肤反应、神经反应或虫体排出；幼龄、怀孕、哺乳、体弱或肝肾异常动物需谨慎。',
  isolation: '三、重点风险提示\n传染病和人畜共患病可能传播给其他动物或人员，需严格隔离、消毒、防护和复查；部分疾病可能进展迅速且预后不确定。',
  referral: '三、重点风险提示\n转诊途中可能发生病情变化、运输应激或急性恶化；若拒绝转诊或延迟转诊，可能错过最佳诊疗窗口。',
  refusal: '三、重点风险提示\n拒绝或延迟检查治疗可能导致诊断延误、病情加重、治疗窗口错过、费用增加、预后变差甚至死亡，相关后果需由宠主自行承担。',
  homecare: '三、重点风险提示\n居家护理依赖宠主执行，漏服药、提前停药、未佩戴头套、未限制活动或未按期复查可能导致复发、感染、伤口裂开或药物不良反应未被发现。',
  chronic: '三、重点风险提示\n慢性病通常无法一次性治愈，需要长期复查和动态调整；自行停药、改药或未监测指标可能导致急性恶化和不可逆损伤。',
  grooming: '三、重点风险提示\n美容洗护可能出现应激、抓咬、皮肤发红、轻微划伤、毛结剃除后皮肤暴露、耳道不适；老年、心肺病、皮肤病或攻击性宠物风险更高。',
  boarding: '三、重点风险提示\n寄养看护可能发生环境应激、食欲下降、腹泻、吠叫、抓咬、逃逸尝试或潜伏疾病显现；宠主需如实告知疫苗、驱虫、病史和攻击史。',
  euthanasia: '三、重点风险提示\n安乐处理完成后不可逆；遗体处理涉及防疫、交接、第三方服务和费用规则，宠主需确认决定真实自愿并选择遗体处理方式。',
}

const associations: Record<string, string[]> = {
  'SVC-REG-001': ['CONSENT_REGISTRATION_TRIAGE'],
  'SVC-REG-002': ['CONSENT_REGISTRATION_TRIAGE'],
  'SVC-REG-003': ['CONSENT_EMERGENCY_CRITICAL', 'CONSENT_REGISTRATION_TRIAGE'],
  'SVC-EXM-101': ['CONSENT_REGISTRATION_TRIAGE', 'CONSENT_EXAM_GENERAL'],
  'SVC-EXM-102': ['CONSENT_REGISTRATION_TRIAGE', 'CONSENT_EXAM_GENERAL'],
  'SVC-EXM-103': ['CONSENT_EXAM_GENERAL', 'CONSENT_LAB_SAMPLE'],
  'SVC-EXM-104': ['CONSENT_EXAM_GENERAL', 'CONSENT_LAB_SAMPLE'],
  'SVC-LAB-101': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-102': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-103': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-104': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-105': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-106': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-107': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-108': ['CONSENT_LAB_SAMPLE'],
  'SVC-LAB-109': ['CONSENT_LAB_SAMPLE', 'CONSENT_ISOLATION'],
  'SVC-LAB-110': ['CONSENT_LAB_SAMPLE', 'CONSENT_ISOLATION'],
  'SVC-LAB-111': ['CONSENT_LAB_SAMPLE', 'CONSENT_ISOLATION'],
  'SVC-LAB-112': ['CONSENT_LAB_SAMPLE', 'CONSENT_ZOONOSIS'],
  'SVC-IMG-101': ['CONSENT_IMAGING_GENERAL'],
  'SVC-IMG-102': ['CONSENT_IMAGING_GENERAL'],
  'SVC-IMG-103': ['CONSENT_IMAGING_GENERAL'],
  'SVC-IMG-104': ['CONSENT_IMAGING_GENERAL'],
  'SVC-TRT-101': ['CONSENT_INJECTION'],
  'SVC-TRT-102': ['CONSENT_INJECTION'],
  'SVC-TRT-103': ['CONSENT_INJECTION', 'CONSENT_INFUSION'],
  'SVC-TRT-104': ['CONSENT_INFUSION'],
  'SVC-TRT-105': ['CONSENT_INFUSION'],
  'SVC-TRT-106': ['CONSENT_OXYGEN_NEBULIZATION'],
  'SVC-TRT-107': ['CONSENT_EXAM_GENERAL', 'CONSENT_INJECTION'],
  'SVC-TRT-108': ['CONSENT_EXAM_GENERAL'],
  'SVC-TRT-109': ['CONSENT_WOUND_DEBRIDEMENT'],
  'SVC-TRT-110': ['CONSENT_WOUND_DEBRIDEMENT', 'CONSENT_HOME_CARE'],
  'SVC-TRT-111': ['CONSENT_EXAM_GENERAL', 'CONSENT_INJECTION'],
  'SVC-TRT-112': ['CONSENT_EXAM_GENERAL'],
  'SVC-SUR-101': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-102': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-103': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-104': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-105': ['CONSENT_SURGERY_GENERAL', 'CONSENT_ANESTHESIA'],
  'SVC-SUR-106': ['CONSENT_WOUND_DEBRIDEMENT', 'CONSENT_SURGERY_GENERAL', 'CONSENT_ANESTHESIA'],
  'SVC-SUR-107': ['CONSENT_SURGERY_GENERAL', 'CONSENT_ANESTHESIA'],
  'SVC-SUR-108': ['CONSENT_SURGERY_GENERAL', 'CONSENT_ANESTHESIA'],
  'SVC-SUR-109': ['CONSENT_SURGERY_GENERAL', 'CONSENT_ANESTHESIA'],
  'SVC-SUR-110': ['CONSENT_DENTAL', 'CONSENT_ANESTHESIA'],
  'SVC-HOS-101': ['CONSENT_HOSPITALIZATION'],
  'SVC-HOS-102': ['CONSENT_ICU_CRITICAL_CARE', 'CONSENT_HOSPITALIZATION'],
  'SVC-HOS-103': ['CONSENT_HOSPITALIZATION'],
  'SVC-HOS-104': ['CONSENT_HOSPITALIZATION'],
  'SVC-HOS-105': ['CONSENT_HOSPITALIZATION'],
  'SVC-HOS-106': ['CONSENT_HOSPITALIZATION'],
  'SVC-GRM-101': ['CONSENT_GROOMING'],
  'SVC-GRM-102': ['CONSENT_GROOMING'],
  'SVC-GRM-103': ['CONSENT_GROOMING'],
  'SVC-GRM-104': ['CONSENT_GROOMING'],
  'SVC-GRM-105': ['CONSENT_GROOMING'],
  'SVC-GRM-106': ['CONSENT_GROOMING'],
  'SVC-GRM-107': ['CONSENT_GROOMING'],
  'SVC-PRE-101': ['CONSENT_VACCINATION', 'CONSENT_INJECTION'],
  'SVC-PRE-102': ['CONSENT_VACCINATION', 'CONSENT_INJECTION'],
  'SVC-PRE-103': ['CONSENT_DEWORMING', 'CONSENT_MEDICATION_OFFLABEL'],
  'SVC-OTH-101': ['CONSENT_HOME_CARE'],
  'SVC-SUR-001': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-002': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-003': ['CONSENT_SURGERY_GENERAL', 'CONSENT_ANESTHESIA'],
  'SVC-NUR-001': ['CONSENT_INJECTION'],
  'SVC-NUR-002': ['CONSENT_INFUSION'],
  'SVC-NUR-003': ['CONSENT_WOUND_DEBRIDEMENT', 'CONSENT_HOME_CARE'],
  'SVC-TRT-001': ['CONSENT_OXYGEN_NEBULIZATION'],
  'SVC-TRT-002': ['CONSENT_EXAM_GENERAL'],
  'SVC-EXM-001': ['CONSENT_REGISTRATION_TRIAGE', 'CONSENT_EXAM_GENERAL'],
  'SVC-EXM-002': ['CONSENT_EXAM_GENERAL', 'CONSENT_LAB_SAMPLE'],
  'SVC-GRM-001': ['CONSENT_GROOMING'],
  'SVC-GRM-002': ['CONSENT_GROOMING'],
}

export class LinkVpetServiceItemsAndConsents1718000000025 implements MigrationInterface {
  name = 'LinkVpetServiceItemsAndConsents1718000000025'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vpet_consent_template_charge_item (
        id int NOT NULL AUTO_INCREMENT,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        charge_item_id int NOT NULL,
        template_id int NOT NULL,
        UNIQUE KEY idx_vpet_consent_charge_item_unique (charge_item_id, template_id),
        KEY idx_vpet_consent_charge_item_item (charge_item_id),
        KEY idx_vpet_consent_charge_item_template (template_id),
        PRIMARY KEY (id),
        CONSTRAINT fk_vpet_consent_charge_item_item FOREIGN KEY (charge_item_id) REFERENCES vpet_charge_item(id) ON DELETE CASCADE,
        CONSTRAINT fk_vpet_consent_charge_item_template FOREIGN KEY (template_id) REFERENCES vpet_consent_template(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await this.enhanceTemplateContent(queryRunner)
    await this.seedAssociations(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS vpet_consent_template_charge_item')
  }

  private async enhanceTemplateContent(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`SELECT code, category, content FROM vpet_consent_template`)
    for (const row of rows) {
      const appendix = categoryRiskAppendix[row.category]
      let content = String(row.content || '')
      content = content
        .replace(/宠主姓名：__________/g, '宠主姓名：[[customer.name]]')
        .replace(/联系电话：__________/g, '联系电话：[[customer.phone]]')
        .replace(/宠物姓名：__________/g, '宠物姓名：[[pet.name]]')
        .replace(/物种\/品种：__________/g, '物种/品种：[[pet.species]] / [[pet.breed]]')
        .replace(/体重：__________kg/g, '体重：[[pet.weight]]kg')
        .replace(/就诊编号：__________/g, '就诊编号：[[visit.visitNo]]')
        .replace(/告知医生：__________/g, '告知医生：[[doctor.name]]')
        .replace(/告知日期：____年__月__日/g, '告知日期：[[today.cn]]')
        .replace(/医护人员签名：__________/g, '医护人员签名：[[doctor.name]]')

      if (appendix && !content.includes('重点风险提示')) {
        content = content.replace(
          '\n本人已阅读并理解以上内容',
          `\n${appendix}\n\n本人已阅读并理解以上内容`,
        )
      }

      await queryRunner.query(
        `UPDATE vpet_consent_template
         SET content = ?,
             variables = ?,
             updated_at = NOW()
         WHERE code = ?`,
        [
          content,
          JSON.stringify([
            { key: 'customer.name', label: '宠主姓名', placeholder: '[[customer.name]]', source: 'customer.name' },
            { key: 'customer.phone', label: '联系电话', placeholder: '[[customer.phone]]', source: 'customer.phone' },
            { key: 'pet.name', label: '宠物姓名', placeholder: '[[pet.name]]', source: 'pet.name' },
            { key: 'pet.species', label: '宠物物种', placeholder: '[[pet.species]]', source: 'pet.species' },
            { key: 'pet.breed', label: '宠物品种', placeholder: '[[pet.breed]]', source: 'pet.breed' },
            { key: 'pet.weight', label: '宠物体重', placeholder: '[[pet.weight]]', source: 'pet.weight' },
            { key: 'visit.visitNo', label: '就诊编号', placeholder: '[[visit.visitNo]]', source: 'visit.visitNo' },
            { key: 'doctor.name', label: '告知医生', placeholder: '[[doctor.name]]', source: 'doctor.name' },
            { key: 'today.cn', label: '告知日期', placeholder: '[[today.cn]]', source: 'system.today' },
          ]),
          row.code,
        ],
      )
    }
  }

  private async seedAssociations(queryRunner: QueryRunner): Promise<void> {
    for (const [itemCode, templateCodes] of Object.entries(associations)) {
      for (const templateCode of templateCodes) {
        await queryRunner.query(
          `INSERT IGNORE INTO vpet_consent_template_charge_item (charge_item_id, template_id)
           SELECT item.id, template.id
           FROM vpet_charge_item item
           INNER JOIN vpet_consent_template template ON template.code = ?
           WHERE item.item_code = ?`,
          [templateCode, itemCode],
        )
      }
    }
  }
}
