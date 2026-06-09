#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import Redis from 'ioredis'
import mysql from 'mysql2/promise'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '..')

loadEnv()

const DATASET_MARK = process.env.VPET_DEMO_MARK || 'GD_DEMO_20260608'
const BASE_URL = (process.env.VPET_DEMO_BASE_URL || `http://127.0.0.1:${process.env.APP_PORT || '7001'}/api`).replace(/\/$/, '')
const ADMIN_USERNAME = process.env.VPET_DEMO_USER || 'admin'
const ADMIN_PASSWORD = process.env.VPET_DEMO_PASSWORD || 'a123456'
const REQUEST_DELAY_MS = Number(process.env.VPET_DEMO_DELAY_MS || 35)
const REQUEST_TIMEOUT_MS = Number(process.env.VPET_DEMO_TIMEOUT_MS || 30000)
const BATCH_SIZE = Number(process.env.VPET_DEMO_BATCH_SIZE || 25)
const BATCH_PAUSE_MS = Number(process.env.VPET_DEMO_BATCH_PAUSE_MS || 1500)
const THROTTLE_COOLDOWN_MS = Number(process.env.VPET_DEMO_THROTTLE_COOLDOWN_MS || 20000)
const PAGE_SIZE = 100
const CUSTOMER_COUNT = Number(process.env.VPET_DEMO_CUSTOMER_COUNT || 220)
const PET_COUNT = Number(process.env.VPET_DEMO_PET_COUNT || 340)
const FUTURE_APPOINTMENT_COUNT = Number(process.env.VPET_DEMO_FUTURE_APPOINTMENT_COUNT || 30)
const CANCELED_APPOINTMENT_COUNT = Number(process.env.VPET_DEMO_CANCELED_APPOINTMENT_COUNT || 10)
const TODAY_WAITING_COUNT = Number(process.env.VPET_DEMO_TODAY_WAITING_COUNT || 10)
const TODAY_CALLED_COUNT = Number(process.env.VPET_DEMO_TODAY_CALLED_COUNT || 5)
const TODAY_CONSULTING_COUNT = Number(process.env.VPET_DEMO_TODAY_CONSULTING_COUNT || 5)
const COMPLETED_APPOINTMENT_COUNT = Number(process.env.VPET_DEMO_COMPLETED_APPOINTMENT_COUNT || 80)
const ACTIVE_HOSPITALIZATION_COUNT = Number(process.env.VPET_DEMO_ACTIVE_HOSPITALIZATION_COUNT || 2)
const DISCHARGED_HOSPITALIZATION_COUNT = Number(process.env.VPET_DEMO_DISCHARGED_HOSPITALIZATION_COUNT || 6)
const MEMBER_CARD_COUNT = Number(process.env.VPET_DEMO_MEMBER_CARD_COUNT || 70)
const DRUG_COUNT = Number(process.env.VPET_DEMO_DRUG_COUNT || 36)
const PRNG_SEED = Number(process.env.VPET_DEMO_SEED || 20260608)
const REFERENCE_DATE = new Date(process.env.VPET_DEMO_REFERENCE_DATE || '2026-06-08T09:00:00+08:00')

const rng = createPrng(PRNG_SEED)
const logPrefix = `[${DATASET_MARK}]`

main().catch((error) => {
  console.error(`${logPrefix} 导入失败`)
  console.error(error?.stack || error?.message || error)
  process.exitCode = 1
})

async function main() {
  console.log(`${logPrefix} 开始导入广东社区宠物医院演示数据`)
  console.log(`${logPrefix} API: ${BASE_URL}`)

  const api = await createApiClient()
  const dicts = await loadReferenceData(api)

  const staffProfiles = buildStaffProfiles()
  const customerPlans = buildCustomerPlans(CUSTOMER_COUNT)
  const petPlans = buildPetPlans(customerPlans, dicts, PET_COUNT)
  const drugCatalog = buildDrugCatalog(DRUG_COUNT)

  console.log(`${logPrefix} 正在导入主数据`)
  const staffState = await ensureStaff(api, staffProfiles)
  const customerState = await ensureCustomers(api, customerPlans)
  const petState = await ensurePets(api, petPlans, customerState.customersByCode)
  const memberCardState = await ensureMemberCards(api, customerPlans, customerState.customersByCode, MEMBER_CARD_COUNT)
  const drugState = await ensureDrugs(api, drugCatalog)

  console.log(`${logPrefix} 正在准备业务链数据`)
  const doctors = staffState.activeDoctors
  if (doctors.length < 3) {
    throw new Error('可用医生数量不足，无法生成预约与就诊数据')
  }

  const assistants = staffState.staffByPosition.assistant || []
  const frontDesk = staffState.staffByPosition.reception?.[0] || null
  const pharmacists = assistants.length > 0 ? assistants : doctors
  const pets = Object.values(petState.petsByCode)
  const appointmentPlans = buildAppointmentPlans({
    doctors,
    pets,
    futureCount: FUTURE_APPOINTMENT_COUNT,
    canceledCount: CANCELED_APPOINTMENT_COUNT,
    todayWaitingCount: TODAY_WAITING_COUNT,
    todayCalledCount: TODAY_CALLED_COUNT,
    todayConsultingCount: TODAY_CONSULTING_COUNT,
    completedCount: COMPLETED_APPOINTMENT_COUNT,
    activeHospCount: ACTIVE_HOSPITALIZATION_COUNT,
    dischargedHospCount: DISCHARGED_HOSPITALIZATION_COUNT,
  })

  console.log(`${logPrefix} 正在导入预约、就诊、处方、收费、检验、住院与提醒数据`)
  const workflowSummary = await ensureAppointmentWorkflows(api, {
    dicts,
    staffState,
    memberCardState,
    drugState,
    appointmentPlans,
    pharmacists,
    frontDesk,
  })

  const summary = await collectSummary(api)
  printSummary(summary, workflowSummary)
}

function loadEnv() {
  const envFiles = [
    path.join(backendRoot, '.env'),
    path.join(backendRoot, '.env.development'),
  ]
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false })
    }
  }
}

async function createApiClient() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  })

  await redis.connect()
  const captcha = await requestRaw('/auth/captcha/img')
  const captchaId = captcha?.data?.id
  if (!captchaId) {
    throw new Error('获取验证码失败')
  }
  const verifyCode = await redis.get(`captcha:img:${captchaId}`)
  await redis.quit()
  if (!verifyCode) {
    throw new Error('无法从 Redis 读取登录验证码')
  }

  const loginRes = await requestRaw('/auth/login', {
    method: 'POST',
    body: {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      captchaId,
      verifyCode,
    },
  })
  const token = loginRes?.data?.token
  if (!token) {
    throw new Error('管理员登录失败，未返回 token')
  }
  console.log(`${logPrefix} 已登录管理员账号 ${ADMIN_USERNAME}`)

  return {
    token,
    request: (url, options = {}) => requestRaw(url, { ...options, token }),
  }
}

async function requestRaw(url, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    token,
    retries = 6,
  } = options

  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await sleep(REQUEST_DELAY_MS)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const fullUrl = buildUrl(url, query)
      const response = await fetch(fullUrl, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const payload = await parseResponse(response)
      if (!response.ok) {
        const err = new Error(payload?.message || `HTTP ${response.status}`)
        err.status = response.status
        err.payload = payload
        throw err
      }

      if (payload?.code !== 200) {
        const err = new Error(payload?.message || '业务接口返回失败')
        err.status = response.status
        err.payload = payload
        throw err
      }
      return payload
    }
    catch (error) {
      lastError = error
      const status = Number(error?.status || 0)
      const message = String(error?.message || '')
      const shouldRetry = status === 429
        || status >= 500
        || message.includes('fetch failed')
        || message.includes('aborted')
        || message.includes('ECONNRESET')
        || message.includes('socket hang up')
      if (!shouldRetry || attempt === retries) {
        throw error
      }
      const backoff = status === 429
        ? THROTTLE_COOLDOWN_MS + attempt * 5000 + randomInt(0, 1000)
        : 500 * (2 ** attempt) + randomInt(0, 250)
      console.warn(`${logPrefix} ${url} 第 ${attempt + 1} 次请求失败，${backoff}ms 后重试: ${message}`)
      await sleep(backoff)
    }
    finally {
      clearTimeout(timeout)
    }
  }

  throw lastError || new Error(`请求失败: ${url}`)
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text)
    return {}
  try {
    return JSON.parse(text)
  }
  catch {
    return { message: text }
  }
}

function buildUrl(url, query) {
  const fullUrl = new URL(`${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '')
        continue
      fullUrl.searchParams.set(key, String(value))
    }
  }
  return fullUrl.toString()
}

async function loadReferenceData(api) {
  const dictTypes = await api.request('/system/dict-type/select-options')
  const typeIdByCode = Object.fromEntries((dictTypes.data || []).map(item => [item.code, item.id]))
  const dictCodes = [
    'pet_species',
    'pet_breed_dog',
    'pet_breed_cat',
    'vpet_doctor_department',
    'vpet_staff_position',
    'vpet_reminder_type',
    'vpet_reminder_channel',
    'vpet_lab_sample_type',
    'vpet_nursing_plan_type',
    'vpet_nursing_level',
  ]

  const dictItems = {}
  for (const code of dictCodes) {
    const typeId = typeIdByCode[code]
    if (!typeId) {
      dictItems[code] = []
      continue
    }
    const items = await paginateAll(page => api.request('/system/dict-item', {
      query: { typeId, page, pageSize: PAGE_SIZE },
    }))
    dictItems[code] = items
  }

  const diagnosisCodes = {
    dog: (await api.request('/vpet/visit/diagnosis-codes', { query: { species: 'dog' } })).data || [],
    cat: (await api.request('/vpet/visit/diagnosis-codes', { query: { species: 'cat' } })).data || [],
    other: (await api.request('/vpet/visit/diagnosis-codes')).data || [],
  }

  return {
    dictTypes: typeIdByCode,
    dictItems,
    diagnosisCodes,
  }
}

async function ensureStaff(api, profiles) {
  const existingStaff = await paginateAll(page => api.request('/vpet/appointment/doctors', {
    query: { page, pageSize: PAGE_SIZE },
  }))
  const staffByPhone = new Map(existingStaff.map(item => [item.phone, item]))

  let created = 0
  let updated = 0

  for (const profile of profiles) {
    const current = staffByPhone.get(profile.phone)
    if (!current) {
      const createdStaff = await api.request('/vpet/appointment/doctors', {
        method: 'POST',
        body: profile,
      })
      staffByPhone.set(profile.phone, createdStaff.data)
      created += 1
      continue
    }

    const patch = {}
    for (const key of ['name', 'title', 'position', 'department', 'introduction']) {
      if (current[key] !== profile[key]) {
        patch[key] = profile[key]
      }
    }
    if (Object.keys(patch).length > 0) {
      await api.request(`/vpet/appointment/doctors/${current.id}`, {
        method: 'PUT',
        body: patch,
      })
      updated += 1
      Object.assign(current, patch)
    }
  }

  const allStaff = Array.from(staffByPhone.values())
  const staffByPosition = groupBy(allStaff, item => item.position || 'doctor')
  console.log(`${logPrefix} 医护人员导入完成，新增 ${created}，更新 ${updated}`)

  return {
    allStaff,
    staffByPhone,
    staffByPosition,
    activeDoctors: (staffByPosition.doctor || []).filter(item => Number(item.status ?? 1) === 1),
  }
}

async function ensureCustomers(api, plans) {
  const existingCustomers = await paginateAll(page => api.request('/vpet/customer', {
    query: { page, pageSize: PAGE_SIZE },
  }))
  const customerByPhone = new Map(existingCustomers.map(item => [item.phone, item]))
  const customersByCode = {}

  let created = 0
  let updated = 0

  for (const plan of plans) {
    const current = customerByPhone.get(plan.phone)
    if (!current) {
      const createdCustomer = await api.request('/vpet/customer', {
        method: 'POST',
        body: plan.payload,
      })
      customerByPhone.set(plan.phone, createdCustomer.data)
      customersByCode[plan.code] = createdCustomer.data
      created += 1
      await maybePauseBatch(created + updated, '客户')
      continue
    }

    customersByCode[plan.code] = current
    const patch = {}
    for (const key of ['name', 'gender', 'birthday', 'address', 'tags', 'remark']) {
      if (normalizeValue(current[key]) !== normalizeValue(plan.payload[key])) {
        patch[key] = plan.payload[key]
      }
    }
    if (Object.keys(patch).length > 0) {
      await api.request(`/vpet/customer/${current.id}`, {
        method: 'PUT',
        body: patch,
      })
      Object.assign(current, patch)
      updated += 1
      await maybePauseBatch(created + updated, '客户')
    }
  }

  console.log(`${logPrefix} 客户导入完成，新增 ${created}，更新 ${updated}`)
  return {
    customersByCode,
    customerByPhone,
  }
}

async function ensurePets(api, petPlans, customersByCode) {
  const existingPets = await paginateAll(page => api.request('/vpet/pet', {
    query: { page, pageSize: PAGE_SIZE },
  }))
  const petByKey = new Map(existingPets.map(item => [petIdentity(item), item]))
  const petsByCode = {}

  let created = 0
  let updated = 0

  for (const plan of petPlans) {
    const customer = customersByCode[plan.customerCode]
    if (!customer) {
      throw new Error(`客户不存在，无法创建宠物: ${plan.customerCode}`)
    }

    const desired = {
      customerId: customer.id,
      ...plan.payload,
    }
    const identity = petIdentity(desired)
    const current = petByKey.get(identity)
    if (!current) {
      const createdPet = await api.request('/vpet/pet', {
        method: 'POST',
        body: desired,
      })
      petByKey.set(identity, createdPet.data)
      petsByCode[plan.code] = createdPet.data
      created += 1
      await maybePauseBatch(created + updated, '宠物')
      continue
    }

    petsByCode[plan.code] = current
    const patch = {}
    for (const key of ['name', 'species', 'breed', 'gender', 'neutered', 'birthday', 'color', 'weight', 'allergy', 'behaviorTag', 'lifeStage']) {
      if (normalizeValue(current[key]) !== normalizeValue(desired[key])) {
        patch[key] = desired[key]
      }
    }
    if (Object.keys(patch).length > 0) {
      await api.request(`/vpet/pet/${current.id}`, {
        method: 'PUT',
        body: patch,
      })
      Object.assign(current, patch)
      updated += 1
    }

    await maybePauseBatch(created + updated, '宠物')
  }

  console.log(`${logPrefix} 宠物导入完成，新增 ${created}，更新 ${updated}`)
  return {
    petsByCode,
  }
}

async function ensureMemberCards(api, customerPlans, customersByCode, targetCount) {
  const customerCodes = customerPlans.slice(0, targetCount).map(item => item.code)
  const memberCardsByCustomerId = {}
  let created = 0
  let recharged = 0

  for (let index = 0; index < customerCodes.length; index += 1) {
    const customer = customersByCode[customerCodes[index]]
    if (!customer)
      continue

    const cardRes = await api.request(`/vpet/member/card/customer/${customer.id}`)
    let card = cardRes.data
    const expectedBalance = 500 + (index % 8) * 300

    if (!card) {
      const createdCard = await api.request('/vpet/member/card', {
        method: 'POST',
        body: {
          customerId: customer.id,
          level: index % 5 === 0 ? 2 : 1,
          initialBalance: expectedBalance,
          giftAmount: index % 6 === 0 ? 100 : 0,
        },
      })
      card = createdCard.data
      created += 1
    }
    else if (Number(card.balance || 0) < expectedBalance) {
      await api.request(`/vpet/member/card/${card.id}/recharge`, {
        method: 'POST',
        body: {
          amount: expectedBalance - Number(card.balance || 0),
          remark: `${DATASET_MARK} 初始余额补足`,
        },
      })
      const refreshed = await api.request(`/vpet/member/card/customer/${customer.id}`)
      card = refreshed.data
      recharged += 1
    }

    memberCardsByCustomerId[customer.id] = card
  }

  console.log(`${logPrefix} 会员卡导入完成，新增 ${created}，补余额 ${recharged}`)
  return { memberCardsByCustomerId }
}

async function ensureDrugs(api, catalog) {
  const existingDrugs = await paginateAll(page => api.request('/vpet/pharmacy', {
    query: { page, pageSize: PAGE_SIZE },
  }))
  const drugsByCode = new Map(existingDrugs.map(item => [item.drugCode, item]))
  const drugsById = {}
  let created = 0
  let updated = 0
  let batchCreated = 0

  for (const item of catalog) {
    let current = drugsByCode.get(item.drugCode)
    if (!current) {
      const createdDrug = await api.request('/vpet/pharmacy', {
        method: 'POST',
        body: {
          drugCode: item.drugCode,
          drugName: item.drugName,
          tradeName: item.tradeName,
          category: item.category,
          drugType: item.drugType,
          specification: item.specification,
          unit: item.unit,
          retailPrice: item.retailPrice,
          purchasePrice: item.purchasePrice,
          supplier: item.supplier,
        },
      })
      current = createdDrug.data
      drugsByCode.set(item.drugCode, current)
      created += 1
    }

    const patch = {}
    for (const key of ['drugName', 'tradeName', 'category', 'drugType', 'specification', 'unit', 'retailPrice', 'supplier']) {
      if (normalizeValue(current[key]) !== normalizeValue(item[key])) {
        patch[key] = item[key]
      }
    }
    if (Number(current.minStock || 0) !== Number(item.minStock || 0)) {
      patch.minStock = item.minStock
    }
    if (normalizeValue(current.storageCondition) !== normalizeValue(item.storageCondition)) {
      patch.storageCondition = item.storageCondition
    }
    if (Object.keys(patch).length > 0) {
      await api.request(`/vpet/pharmacy/${current.id}`, {
        method: 'PUT',
        body: patch,
      })
      Object.assign(current, patch)
      updated += 1
    }

    const batchesRes = await api.request(`/vpet/pharmacy/${current.id}/batches`)
    const existingBatchNos = new Set((batchesRes.data || []).map(batch => batch.batchNo))
    for (const batch of item.batches) {
      if (existingBatchNos.has(batch.batchNo))
        continue
      await api.request(`/vpet/pharmacy/${current.id}/stock-in`, {
        method: 'POST',
        body: batch,
      })
      batchCreated += 1
    }

    const detailRes = await api.request(`/vpet/pharmacy/${current.id}`)
    drugsById[current.id] = detailRes.data
  }

  console.log(`${logPrefix} 药房导入完成，新增药品 ${created}，更新药品 ${updated}，新增批次 ${batchCreated}`)
  return {
    drugsById,
    drugList: Object.values(drugsById),
  }
}

async function ensureAppointmentWorkflows(api, context) {
  const {
    dicts,
    staffState,
    memberCardState,
    drugState,
    appointmentPlans,
    pharmacists,
    frontDesk,
  } = context

  const existingAppointments = await paginateAll(page => api.request('/vpet/appointment', {
    query: { page, pageSize: PAGE_SIZE, keyword: DATASET_MARK },
  }))
  const appointmentsByMarker = new Map()
  for (const item of existingAppointments) {
    const marker = extractMarker(item.remark) || extractMarker(item.reason)
    if (marker)
      appointmentsByMarker.set(marker, item)
  }

  const existingHospitals = await paginateAll(page => api.request('/vpet/hosp', {
    query: { page, pageSize: PAGE_SIZE },
  }))
  const hospByVisitId = new Map(existingHospitals.map(item => [Number(item.visitId), item]))

  const reminderList = await paginateAll(page => api.request('/vpet/reminder', {
    query: { page, pageSize: PAGE_SIZE, keyword: DATASET_MARK },
  }))
  const reminderByMarker = new Map()
  for (const item of reminderList) {
    const marker = extractMarker(item.reminderName) || extractMarker(item.remark)
    if (marker)
      reminderByMarker.set(marker, item)
  }

  const summary = {
    appointmentsCreated: 0,
    appointmentsUpdated: 0,
    appointmentsCanceled: 0,
    visitsCheckedIn: 0,
    visitsCalled: 0,
    visitsStarted: 0,
    visitsEnded: 0,
    prescriptionsCreated: 0,
    prescriptionsDispensed: 0,
    billingsCreated: 0,
    billingsPaid: 0,
    labsCreated: 0,
    labsReported: 0,
    hospitalizationsCreated: 0,
    hospitalizationsDischarged: 0,
    remindersCreated: 0,
  }

  for (const plan of appointmentPlans) {
    let appointment = appointmentsByMarker.get(plan.marker)
    if (!appointment) {
      const created = await api.request('/vpet/appointment', {
        method: 'POST',
        body: {
          customerId: plan.customerId,
          petId: plan.petId,
          doctorId: plan.doctorId,
          visitType: plan.visitType,
          appointmentTime: plan.appointmentTime,
          reason: plan.reason,
          remark: `[${plan.marker}] ${plan.remark}`,
        },
      })
      appointment = created.data
      appointmentsByMarker.set(plan.marker, appointment)
      summary.appointmentsCreated += 1
    }
    else {
      const patch = {}
      if (appointment.customerId !== plan.customerId)
        patch.customerId = plan.customerId
      if (appointment.petId !== plan.petId)
        patch.petId = plan.petId
      if (Number(appointment.doctorId || 0) !== Number(plan.doctorId || 0))
        patch.doctorId = plan.doctorId
      if (appointment.visitType !== plan.visitType)
        patch.visitType = plan.visitType
      if (appointment.appointmentTime !== plan.appointmentTime)
        patch.appointmentTime = plan.appointmentTime
      if (appointment.reason !== plan.reason)
        patch.reason = plan.reason
      if (appointment.remark !== `[${plan.marker}] ${plan.remark}`)
        patch.remark = `[${plan.marker}] ${plan.remark}`
      if (Object.keys(patch).length > 0) {
        await api.request(`/vpet/appointment/${appointment.id}`, {
          method: 'PUT',
          body: patch,
        })
        Object.assign(appointment, patch)
        summary.appointmentsUpdated += 1
      }
    }

    if (plan.mode === 'canceled') {
      if (Number(appointment.status) !== 4) {
        await api.request(`/vpet/appointment/${appointment.id}/cancel`, { method: 'POST' })
        appointment.status = 4
        summary.appointmentsCanceled += 1
      }
      continue
    }

    if (plan.mode === 'booked') {
      continue
    }

    let visit = await getVisitByAppointment(api, appointment.id)
    if (!visit) {
      const checkedIn = await api.request(`/vpet/appointment/${appointment.id}/checkin`, { method: 'POST' })
      visit = checkedIn.data
      summary.visitsCheckedIn += 1
    }

    if (['called', 'consulting', 'completed', 'completed_rx', 'completed_lab', 'completed_lab_rx', 'hosp_active', 'hosp_discharged'].includes(plan.mode)
      && Number(visit.status) === 1) {
      await api.request('/vpet/queue/call', {
        method: 'POST',
        body: {
          doctorId: plan.doctorId,
          visitId: visit.id,
        },
      })
      visit = await getVisitByAppointment(api, appointment.id)
      summary.visitsCalled += 1
    }

    if (['consulting', 'completed', 'completed_rx', 'completed_lab', 'completed_lab_rx', 'hosp_active', 'hosp_discharged'].includes(plan.mode)
      && Number(visit.status) !== 3
      && Number(visit.status) !== 4) {
      const started = await api.request(`/vpet/visit/${visit.id}/start`, { method: 'POST' })
      visit = started.data
      summary.visitsStarted += 1
    }

    if (plan.soap) {
      const diagnosis = pickDiagnosis(dicts.diagnosisCodes, plan.species)
      await api.request(`/vpet/visit/${visit.id}`, {
        method: 'PUT',
        body: {
          chiefComplaint: plan.soap.chiefComplaint,
          treatmentPlan: plan.soap.treatmentPlan,
          doctorAdvice: plan.soap.doctorAdvice,
          physicalExam: JSON.stringify({ note: plan.soap.physicalExam }),
          diagnosis: diagnosis ? JSON.stringify([diagnosis]) : undefined,
          startTime: plan.soap.startTime,
          endTime: plan.soap.endTime,
        },
      })
      visit = await getVisitByAppointment(api, appointment.id)
      plan.diagnosis = diagnosis
    }

    if (plan.lab) {
      const labs = await paginateAll(page => api.request('/vpet/lab', {
        query: { visitId: visit.id, page, pageSize: PAGE_SIZE },
      }))
      let lab = labs[0]
      if (!lab) {
        const createdLab = await api.request('/vpet/lab', {
          method: 'POST',
          body: buildLabPayload(plan, visit),
        })
        lab = createdLab.data
        summary.labsCreated += 1
      }

      if (Number(lab.status) !== 4) {
        await api.request(`/vpet/lab/${lab.id}/lis`, {
          method: 'POST',
          body: {
            deviceCode: plan.lab.deviceCode,
          },
        })
        await api.request(`/vpet/lab/${lab.id}/report`, {
          method: 'PUT',
          body: {
            sampledAt: plan.lab.sampledAt,
            reportedAt: plan.lab.reportedAt,
            reportSummary: plan.lab.reportSummary,
            status: 4,
            items: plan.lab.items,
          },
        })
        summary.labsReported += 1
      }
    }

    const manualBilling = plan.billing ? await ensureManualBilling(api, plan, visit) : null
    if (manualBilling?.created) {
      summary.billingsCreated += 1
    }

    let prescriptions = []
    if (plan.rx) {
      prescriptions = (await api.request(`/vpet/prescription/visit/${visit.id}`)).data || []
      if (prescriptions.length === 0) {
        const createdRx = await api.request('/vpet/prescription', {
          method: 'POST',
          body: buildPrescriptionPayload(plan, visit, drugState.drugList),
        })
        prescriptions = [createdRx.data]
        summary.prescriptionsCreated += 1
      }

      const rx = prescriptions[0]
      if (Number(rx.status) !== 4) {
        await api.request(`/vpet/prescription/${rx.id}/submit`, { method: 'POST' })
        await api.request(`/vpet/prescription/${rx.id}/review`, {
          method: 'PUT',
          body: {
            pharmacistId: pick(pharmacists).id,
            status: 3,
          },
        })
        await api.request(`/vpet/prescription/${rx.id}/dispense`, {
          method: 'POST',
          body: {
            pharmacistId: pick(pharmacists).id,
          },
        })
        summary.prescriptionsDispensed += 1
      }

      await api.request(`/vpet/billing/visit/${visit.id}/sync`, { method: 'POST' })
    }

    if (plan.hospitalization) {
      let hosp = hospByVisitId.get(Number(visit.id))
      if (!hosp) {
        const createdHosp = await api.request('/vpet/hosp', {
          method: 'POST',
          body: buildHospitalizationPayload(plan, visit),
        })
        hosp = createdHosp.data
        hospByVisitId.set(Number(visit.id), hosp)
        summary.hospitalizationsCreated += 1
      }

      const plans = (await api.request(`/vpet/hosp/${hosp.id}/nursing`)).data || []
      if (plans.length === 0) {
        for (const nursingPlan of plan.hospitalization.nursingPlans) {
          await api.request(`/vpet/hosp/${hosp.id}/nursing`, {
            method: 'POST',
            body: nursingPlan,
          })
        }
      }

      const refreshedPlans = (await api.request(`/vpet/hosp/${hosp.id}/nursing`)).data || []
      for (const nursingPlan of refreshedPlans.slice(0, 2)) {
        if ((nursingPlan.executions || []).length > 0)
          continue
        await api.request(`/vpet/hosp/nursing/${nursingPlan.id}/execute`, {
          method: 'POST',
          body: {
            executorId: pick(pharmacists).id,
            executorName: pick(assistantNames(staffState)).name,
            status: 2,
            executedAt: nursingPlan.scheduledTime,
            resultNote: '已按计划执行，生命体征平稳',
            vitalSigns: {
              temp: randomFloat(38.2, 39.3, 1),
              hr: randomInt(96, 132),
              rr: randomInt(20, 34),
            },
          },
        })
      }

      if (plan.hospitalization.discharge && Number(hosp.status) !== 2) {
        await api.request(`/vpet/hosp/${hosp.id}/discharge`, {
          method: 'POST',
          body: {
            dischargeAt: plan.hospitalization.dischargeAt,
            dischargeSummary: plan.hospitalization.dischargeSummary,
          },
        })
        summary.hospitalizationsDischarged += 1
      }
    }

    if (plan.reminder) {
      let reminder = reminderByMarker.get(plan.reminder.marker)
      if (!reminder) {
        const createdReminder = await api.request('/vpet/reminder', {
          method: 'POST',
          body: {
            customerId: plan.customerId,
            petId: plan.petId,
            visitId: visit.id,
            type: plan.reminder.type,
            reminderName: `${plan.reminder.reminderName} [${plan.reminder.marker}]`,
            dueDate: plan.reminder.dueDate,
            channel: plan.reminder.channel,
            remark: `[${plan.reminder.marker}] ${plan.reminder.remark}`,
          },
        })
        reminder = createdReminder.data
        reminderByMarker.set(plan.reminder.marker, reminder)
        summary.remindersCreated += 1
      }
    }

    if (plan.payments) {
      const bills = (await api.request(`/vpet/billing/visit/${visit.id}`)).data || []
      for (const bill of bills) {
        const due = Math.max(Number(bill.totalAmount || 0) - Number(bill.discount || 0) - Number(bill.paidAmount || 0), 0)
        if (due <= 0)
          continue
        const paymentPlan = choosePaymentPlan(plan, due, memberCardState.memberCardsByCustomerId[plan.customerId], frontDesk)
        await api.request(`/vpet/billing/${bill.id}/pay`, {
          method: 'POST',
          body: paymentPlan,
        })
        summary.billingsPaid += 1
      }
    }

    if (['completed', 'completed_rx', 'completed_lab', 'completed_lab_rx', 'hosp_active', 'hosp_discharged'].includes(plan.mode)) {
      const latestVisit = await getVisitByAppointment(api, appointment.id)
      if (Number(latestVisit.status) !== 4) {
        await api.request(`/vpet/visit/${visit.id}`, {
          method: 'PUT',
          body: {
            startTime: plan.soap?.startTime,
            endTime: plan.soap?.endTime,
          },
        })
        await api.request(`/vpet/visit/${visit.id}/end`, { method: 'POST' })
        summary.visitsEnded += 1
      }
    }
  }

  return summary
}

async function ensureManualBilling(api, plan, visit) {
  const bills = (await api.request(`/vpet/billing/visit/${visit.id}`)).data || []
  if (bills.length > 0) {
    return { created: false, bill: bills[0] }
  }

  const details = [
    {
      itemType: 1,
      itemName: '门诊诊疗费',
      quantity: 1,
      unitPrice: plan.billing.consultationFee,
    },
  ]

  if (plan.lab) {
    details.push({
      itemType: 2,
      itemName: plan.lab.testName,
      quantity: 1,
      unitPrice: plan.billing.labFee,
      sourceType: 'lab',
    })
  }

  if (plan.hospitalization) {
    details.push({
      itemType: 4,
      itemName: '住院押金',
      quantity: 1,
      unitPrice: plan.hospitalization.depositAmount,
      sourceType: 'hospitalization',
    })
  }

  const created = await api.request('/vpet/billing', {
    method: 'POST',
    body: {
      visitId: visit.id,
      customerId: plan.customerId,
      discount: plan.billing.discount,
      details,
    },
  })
  return { created: true, bill: created.data }
}

async function getVisitByAppointment(api, appointmentId) {
  const visitRes = await api.request('/vpet/visit', {
    query: {
      appointmentId,
      page: 1,
      pageSize: PAGE_SIZE,
    },
  })
  const items = visitRes.data?.items || []
  return items[0] || null
}

function buildLabPayload(plan, visit) {
  return {
    visitId: visit.id,
    customerId: plan.customerId,
    petId: plan.petId,
    doctorId: plan.doctorId,
    testName: plan.lab.testName,
    sampleType: plan.lab.sampleType,
    items: plan.lab.items.map(item => ({
      ...item,
    })),
  }
}

function buildPrescriptionPayload(plan, visit, drugList) {
  const selectedDrugs = pickPrescriptionDrugs(drugList, plan.rx.detailCount)
  return {
    visitId: visit.id,
    doctorId: plan.doctorId,
    diagnosisSummary: plan.diagnosis?.name || plan.reason,
    details: selectedDrugs.map(drug => ({
      drugId: drug.id,
      drugName: drug.drugName,
      specification: drug.specification,
      dosage: randomDosage(drug.unit),
      frequency: pick(['bid', 'tid', 'sid']),
      quantity: randomInt(1, 4),
      unitPrice: Number(drug.retailPrice || 0),
    })),
  }
}

function buildHospitalizationPayload(plan, visit) {
  return {
    visitId: visit.id,
    customerId: plan.customerId,
    petId: plan.petId,
    doctorId: plan.doctorId,
    cageCode: plan.hospitalization.cageCode,
    admissionAt: plan.hospitalization.admissionAt,
    dailyFee: plan.hospitalization.dailyFee,
    depositAmount: plan.hospitalization.depositAmount,
    nursingLevel: plan.hospitalization.nursingLevel,
    admissionDiagnosis: plan.diagnosis?.name || plan.reason,
    remark: plan.hospitalization.remark,
  }
}

function choosePaymentPlan(plan, dueAmount, memberCard, frontDesk) {
  const cashierId = frontDesk?.id || null
  const shouldUseMember = plan.payments.useMember && memberCard && Number(memberCard.balance || 0) >= dueAmount
  if (shouldUseMember) {
    return {
      paymentMethod: 4,
      paidAmount: dueAmount,
      customerId: plan.customerId,
      memberCardId: memberCard.id,
      cashierId,
      remark: `${DATASET_MARK} 会员卡支付`,
    }
  }

  return {
    paymentMethod: pick([1, 3, 2]),
    paidAmount: dueAmount,
    cashierId,
    customerId: plan.customerId,
    tradeNo: `TXN${Date.now()}${randomInt(100, 999)}`,
    remark: `${DATASET_MARK} 支付完成`,
  }
}

async function collectSummary(api) {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  })

  const tables = [
    'vpet_doctor',
    'vpet_customer',
    'vpet_pet',
    'vpet_drug',
    'vpet_drug_batch',
    'vpet_appointment',
    'vpet_visit',
    'vpet_prescription',
    'vpet_billing',
    'vpet_lab_order',
    'vpet_hospitalization',
    'vpet_reminder',
    'vpet_member_card',
  ]

  const counts = {}
  for (const table of tables) {
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${table}`)
    counts[table] = Number(rows[0]?.total || 0)
  }

  const [positionRows] = await db.query(`
    SELECT position, COUNT(*) AS total
    FROM vpet_doctor
    GROUP BY position
    ORDER BY position ASC
  `)
  counts.staffPositions = Object.fromEntries(positionRows.map(row => [row.position, Number(row.total)]))
  await db.end()

  const apptList = await paginateAll(page => api.request('/vpet/appointment', {
    query: { page, pageSize: PAGE_SIZE, keyword: DATASET_MARK },
  }))
  counts.datasetAppointments = apptList.length
  counts.datasetUpcomingAppointments = apptList.filter(item => Number(item.status) === 1).length
  counts.datasetCheckedInAppointments = apptList.filter(item => Number(item.status) === 2).length
  counts.datasetCompletedAppointments = apptList.filter(item => Number(item.status) === 3).length
  counts.datasetCanceledAppointments = apptList.filter(item => Number(item.status) === 4).length
  return counts
}

function printSummary(summary, workflowSummary) {
  console.log(`${logPrefix} 数据导入完成`)
  console.log(`${logPrefix} 业务链统计: ${JSON.stringify(workflowSummary, null, 2)}`)
  console.log(`${logPrefix} 表计数统计: ${JSON.stringify(summary, null, 2)}`)
}

async function paginateAll(fetchPage) {
  const items = []
  for (let page = 1; ; page += 1) {
    const response = await fetchPage(page)
    const pageItems = Array.isArray(response.data?.items)
      ? response.data.items
      : Array.isArray(response.data)
        ? response.data
        : []
    items.push(...pageItems)
    if (pageItems.length < PAGE_SIZE)
      break
  }
  return items
}

function buildStaffProfiles() {
  return [
    {
      name: '陈嘉雯',
      phone: '13800126001',
      title: '主治兽医师',
      position: 'doctor',
      department: 'internal',
      introduction: '擅长犬猫内科、消化道疾病与老年宠物慢病管理',
    },
    {
      name: '林志恒',
      phone: '13800126002',
      title: '执业兽医师',
      position: 'doctor',
      department: 'surgery',
      introduction: '擅长软组织外科、创伤处置与术后康复管理',
    },
    {
      name: '黄雅琪',
      phone: '13800126003',
      title: '主治兽医师',
      position: 'doctor',
      department: 'dermatology',
      introduction: '擅长皮肤科、耳科以及复诊随访管理',
    },
    {
      name: '郑子轩',
      phone: '13800126011',
      title: '高级医助',
      position: 'assistant',
      department: 'internal',
      introduction: '负责分诊、采样、留置与住院护理执行',
    },
    {
      name: '吴诗敏',
      phone: '13800126012',
      title: '医助',
      position: 'assistant',
      department: 'internal',
      introduction: '负责化验采样、住院巡护与用药执行',
    },
    {
      name: '梁梓豪',
      phone: '13800126013',
      title: '医助',
      position: 'assistant',
      department: 'surgery',
      introduction: '负责术前准备、术后监测与输液治疗',
    },
    {
      name: '谢婉婷',
      phone: '13800126014',
      title: '医助',
      position: 'assistant',
      department: 'dermatology',
      introduction: '负责皮肤病例复查、药浴护理与住院记录',
    },
    {
      name: '何俊霖',
      phone: '13800126015',
      title: '夜间医助',
      position: 'assistant',
      department: 'emergency',
      introduction: '负责夜诊留观、应急补液与叫号协助',
    },
    {
      name: '邓晓晴',
      phone: '13800126021',
      title: '前台主管',
      position: 'reception',
      department: 'checkup',
      introduction: '负责预约挂号、收费收银与会员维护',
    },
    {
      name: '梁可欣',
      phone: '13800126031',
      title: '资深美容师',
      position: 'groomer',
      department: 'checkup',
      introduction: '负责基础洗护、美容护理与皮肤护理建议',
    },
  ]
}

function buildCustomerPlans(count) {
  const surnames = ['陈', '林', '黄', '张', '李', '吴', '梁', '何', '罗', '郑', '谢', '邓', '周', '许', '苏', '冯', '曾', '叶', '潘', '谭', '郭', '廖', '彭', '钟', '黎']
  const givenA = ['嘉', '子', '雅', '俊', '婉', '泽', '诗', '志', '梓', '欣', '浩', '宇', '晴', '慧', '颖', '可', '文', '瑞', '乐', '安']
  const givenB = ['雯', '琪', '婷', '恒', '轩', '豪', '敏', '霖', '珊', '怡', '楠', '彤', '琳', '妍', '宁', '茵', '榕', '希', '朗', '君']
  const cities = ['广州', '佛山', '深圳', '东莞', '珠海', '中山']
  const districts = ['天河区', '海珠区', '番禺区', '南海区', '禅城区', '龙岗区', '宝安区', '南城区', '香洲区', '石岐区']
  const communities = ['金域华府', '万科花园', '保利中央公馆', '碧桂园花城', '雅居乐花园', '时代天境', '星汇云城', '锦绣香江', '招商雍景湾', '龙湖春江']
  const tags = ['老客', '多宠家庭', '疫苗提醒', '会员意向', '附近社区', '慢病复诊']

  const plans = []
  for (let index = 0; index < count; index += 1) {
    const code = `C${String(index + 1).padStart(4, '0')}`
    const name = `${pick(surnames)}${pick(givenA)}${pick(givenB)}`
    const phone = `13${String(600010000 + index).slice(-9)}`
    const gender = index % 2 === 0 ? 1 : 2
    const city = pick(cities)
    const district = pick(districts)
    const community = pick(communities)
    const birthday = formatDate(dateAdd(REFERENCE_DATE, -(365 * randomInt(24, 52))))
    const remark = `[${DATASET_MARK}/${code}] 居住于${city}${district}${community}，常到店消费`
    plans.push({
      code,
      phone,
      payload: {
        name,
        phone,
        gender,
        birthday,
        address: `${city}${district}${community}${randomInt(1, 18)}栋${randomInt(101, 2802)}室`,
        tags: `${pick(tags)},${pick(tags)}`,
        remark,
      },
    })
  }
  return plans
}

function buildPetPlans(customerPlans, dicts, targetCount) {
  const dogBreeds = (dicts.dictItems.pet_breed_dog || []).map(item => item.label).filter(Boolean)
  const catBreeds = (dicts.dictItems.pet_breed_cat || []).map(item => item.label).filter(Boolean)
  const dogNames = ['旺财', '多多', '可乐', '元宝', '奶茶', '球球', '豆豆', '七七', '布丁', '毛豆', 'Lucky', 'Milo', '阿福', '糯米', '可可']
  const catNames = ['咪咪', '团子', '芝麻', '奶盖', '小橘', '汤圆', '花卷', '布偶', '豆包', '乌龙', 'Nana', 'Momo', '果冻', '雪球', '啵啵']
  const otherNames = ['啾啾', '布布', '棉花', '小白', '豆苗', '栗子', '糯糯', '桃桃']
  const otherSpecies = ['兔子', '仓鼠', '豚鼠', '鹦鹉', '龙猫']
  const colors = ['白色', '黑白', '橘白', '三花', '浅棕', '深棕', '灰色', '虎斑', '奶油色', '米黄色']
  const allergies = ['鸡肉轻敏', '海鲜轻敏', '无已知过敏', '外耳炎史', '皮肤瘙痒体质']
  const behaviors = ['胆小', '亲人', '怕生', '活泼', '易应激', '可抱持', '对外出敏感']

  const petCounts = buildPetCountDistribution(customerPlans.length, targetCount)
  const plans = []
  let sequence = 1
  for (let customerIndex = 0; customerIndex < customerPlans.length; customerIndex += 1) {
    const customer = customerPlans[customerIndex]
    const petCount = petCounts[customerIndex]
    for (let petIndex = 0; petIndex < petCount; petIndex += 1) {
      const species = weightedPick([
        { value: 'dog', weight: 64 },
        { value: 'cat', weight: 31 },
        { value: 'other', weight: 5 },
      ])
      const breed = species === 'dog'
        ? pick(dogBreeds)
        : species === 'cat'
          ? pick(catBreeds)
          : pick(otherSpecies)
      const ageYears = species === 'other' ? randomInt(1, 5) : randomInt(1, 13)
      const birthday = formatDate(dateAdd(REFERENCE_DATE, -randomInt(ageYears * 320, ageYears * 365 + 120)))
      const gender = randomInt(1, 2)
      const neutered = ageYears >= 1 ? (maybe(0.72) ? 1 : 0) : 0
      const weight = species === 'dog'
        ? randomFloat(2.4, 28.5, 1)
        : species === 'cat'
          ? randomFloat(2.3, 6.5, 1)
          : randomFloat(0.2, 2.1, 1)
      const code = `P${String(sequence).padStart(4, '0')}`
      sequence += 1
      plans.push({
        code,
        customerCode: customer.code,
        payload: {
          name: uniquePetName(species, petIndex, { dogNames, catNames, otherNames }),
          species,
          breed,
          gender,
          neutered,
          birthday,
          color: pick(colors),
          weight,
          allergy: pick(allergies),
          behaviorTag: pick(behaviors),
          lifeStage: ageYears <= 1 ? 1 : ageYears <= 7 ? 2 : 3,
        },
      })
    }
  }
  return plans
}

function buildDrugCatalog(limit) {
  const base = [
    ['GDDR001', '阿莫西林克拉维酸钾片', '速诺', '50mg*10片', '片', 6.8, 4.2, 18, '广东宠医供应链', '常温避光'],
    ['GDDR002', '头孢噻呋注射液', '赛福宁', '1g/瓶', '瓶', 48, 32, 12, '华南兽药配送', '阴凉'],
    ['GDDR003', '恩诺沙星片', '拜有利', '15mg*10片', '片', 8.5, 5.5, 20, '广东宠医供应链', '常温'],
    ['GDDR004', '马罗匹坦止吐片', '止呕灵', '16mg*4片', '盒', 158, 118, 6, '爱宠专线', '阴凉'],
    ['GDDR005', '美洛昔康口服液', '麦洛舒', '10ml/瓶', '瓶', 86, 58, 10, '华南兽药配送', '常温'],
    ['GDDR006', '甲硝唑片', '甲硝安', '200mg*24片', '片', 1.8, 0.6, 60, '社区药采中心', '常温'],
    ['GDDR007', '泼尼松龙片', '普得灵', '5mg*100片', '片', 2.2, 0.8, 80, '广东宠医供应链', '常温'],
    ['GDDR008', '益生菌粉', '肠安宁', '2g*10袋', '袋', 9.8, 5.3, 35, '爱宠专线', '常温'],
    ['GDDR009', '奥美拉唑肠溶胶囊', '胃舒宁', '10mg*14粒', '粒', 3.2, 1.4, 40, '社区药采中心', '常温'],
    ['GDDR010', '外耳滴剂', '耳舒洁', '15ml/瓶', '瓶', 56, 32, 15, '华南兽药配送', '常温'],
    ['GDDR011', '皮肤喷剂', '皮康宁', '30ml/瓶', '瓶', 72, 46, 10, '华南兽药配送', '避光'],
    ['GDDR012', '驱虫滴剂', '福来恩', '0.67ml*3支', '盒', 118, 86, 10, '爱宠专线', '常温'],
    ['GDDR013', '体内驱虫片', '拜宠清', '4片/盒', '盒', 88, 61, 12, '爱宠专线', '常温'],
    ['GDDR014', '猫三联疫苗', '妙三多', '1ml/支', '支', 128, 88, 20, '冷链生物', '冷藏'],
    ['GDDR015', '犬五联疫苗', '卫佳伍', '1ml/支', '支', 108, 73, 20, '冷链生物', '冷藏'],
    ['GDDR016', '狂犬疫苗', '瑞比克', '1ml/支', '支', 75, 48, 25, '冷链生物', '冷藏'],
    ['GDDR017', '注射用乳酸林格液', '林格液', '500ml/袋', '袋', 22, 11, 30, '社区药采中心', '常温'],
    ['GDDR018', '葡萄糖氯化钠注射液', '葡氯', '250ml/袋', '袋', 16, 8, 30, '社区药采中心', '常温'],
    ['GDDR019', '维生素B族注射液', 'VB复合', '2ml*10支', '支', 4.8, 1.8, 40, '社区药采中心', '常温'],
    ['GDDR020', '止血敏注射液', '酚磺乙胺', '2ml*10支', '支', 5.8, 2.1, 25, '华南兽药配送', '常温'],
    ['GDDR021', '麻醉诱导剂', '丙泊酚', '20ml/支', '支', 118, 88, 8, '手术专供', '避光'],
    ['GDDR022', '布托啡诺注射液', '镇痛宁', '1ml*10支', '支', 36, 18, 12, '手术专供', '阴凉'],
    ['GDDR023', '咪达唑仑注射液', '咪达安', '2ml*10支', '支', 18, 8, 18, '手术专供', '避光'],
    ['GDDR024', '多西环素片', '强力霉素', '50mg*20片', '片', 4.6, 1.9, 50, '广东宠医供应链', '常温'],
    ['GDDR025', '氯雷他定片', '抗敏舒', '10mg*6片', '片', 2.4, 0.9, 30, '社区药采中心', '常温'],
    ['GDDR026', '蒙脱石散', '思密达', '3g*10袋', '袋', 4.5, 2.1, 24, '社区药采中心', '常温'],
    ['GDDR027', '复方洗耳液', '洁耳康', '60ml/瓶', '瓶', 42, 25, 14, '华南兽药配送', '常温'],
    ['GDDR028', '滴眼液', '润眼清', '10ml/瓶', '瓶', 46, 24, 12, '华南兽药配送', '避光'],
    ['GDDR029', '肝脏保健片', '肝宁宝', '30片/瓶', '瓶', 98, 63, 10, '爱宠专线', '常温'],
    ['GDDR030', '关节营养片', '关节康', '60片/瓶', '瓶', 126, 84, 8, '爱宠专线', '常温'],
    ['GDDR031', '猫罐头处方粮', '肠胃护理罐', '85g/罐', '罐', 18, 10, 40, '宠食供应链', '常温'],
    ['GDDR032', '犬处方粮小袋', '低敏处方粮', '1.5kg/袋', '袋', 138, 98, 6, '宠食供应链', '阴凉干燥'],
    ['GDDR033', '胰酶粉', '胰宝', '60g/瓶', '瓶', 76, 52, 10, '广东宠医供应链', '常温'],
    ['GDDR034', '甲状腺素片', '左甲片', '0.1mg*100片', '片', 1.9, 0.7, 40, '社区药采中心', '常温'],
    ['GDDR035', '洗必泰消毒液', '术前消毒液', '500ml/瓶', '瓶', 28, 14, 18, '手术专供', '常温'],
    ['GDDR036', '留置针套包', '24G留置针', '1支/包', '包', 8.8, 3.6, 50, '社区药采中心', '常温'],
    ['GDDR037', '营养膏', '宠补乐', '120g/支', '支', 82, 54, 12, '爱宠专线', '常温'],
    ['GDDR038', '皮下补液针包', '补液包', '1套/包', '包', 18, 8.5, 24, '手术专供', '常温'],
  ]

  return base.slice(0, limit).map((row, index) => ({
    drugCode: row[0],
    drugName: row[1],
    tradeName: row[2],
    specification: row[3],
    unit: row[4],
    retailPrice: row[5],
    purchasePrice: row[6],
    minStock: row[7],
    supplier: row[8],
    storageCondition: row[9],
    category: index % 4 === 0 ? 2 : 1,
    drugType: row[9].includes('冷藏') ? 2 : 1,
    batches: buildDrugBatches(row[6], row[7], index),
  }))
}

function buildDrugBatches(purchasePrice, minStock, index) {
  const batchCount = index % 5 === 0 ? 3 : 2
  const batches = []
  for (let i = 0; i < batchCount; i += 1) {
    const expireDays = i === 0 && index % 7 === 0
      ? randomInt(10, 28)
      : randomInt(120, 760)
    const quantity = i === 0 && index % 9 === 0
      ? Math.max(2, Math.floor(minStock / 2))
      : randomInt(Math.max(8, minStock), Math.max(20, minStock * 4))
    const batchDate = formatDate(dateAdd(REFERENCE_DATE, randomInt(-160, 0)))
    batches.push({
      quantity,
      purchasePrice,
      batchNo: `GD${batchDate.replaceAll('-', '')}${String(i + 1).padStart(2, '0')}`,
      expireDate: formatDate(dateAdd(REFERENCE_DATE, expireDays)),
    })
  }
  return batches
}

function buildAppointmentPlans(options) {
  const {
    doctors,
    pets,
    futureCount,
    canceledCount,
    todayWaitingCount,
    todayCalledCount,
    todayConsultingCount,
    completedCount,
    activeHospCount,
    dischargedHospCount,
  } = options

  const reusablePets = shuffle([...pets])
  const plans = []
  let cursor = 0

  function nextPet() {
    if (cursor >= reusablePets.length) {
      cursor = 0
      shuffleInPlace(reusablePets)
    }
    return reusablePets[cursor++]
  }

  for (let i = 0; i < futureCount; i += 1) {
    const pet = nextPet()
    const doctor = doctors[i % doctors.length]
    plans.push(createAppointmentPlan({
      index: plans.length + 1,
      mode: 'booked',
      pet,
      doctor,
      appointmentTime: formatDateTime(setBusinessTime(dateAdd(REFERENCE_DATE, randomInt(1, 14)), randomInt(9, 18), pick([0, 15, 30, 45]))),
    }))
  }

  for (let i = 0; i < canceledCount; i += 1) {
    const pet = nextPet()
    const doctor = doctors[i % doctors.length]
    plans.push(createAppointmentPlan({
      index: plans.length + 1,
      mode: 'canceled',
      pet,
      doctor,
      appointmentTime: formatDateTime(setBusinessTime(dateAdd(REFERENCE_DATE, randomInt(1, 10)), randomInt(9, 18), pick([0, 30]))),
    }))
  }

  for (let i = 0; i < todayWaitingCount; i += 1) {
    const pet = nextPet()
    const doctor = doctors[i % doctors.length]
    plans.push(createAppointmentPlan({
      index: plans.length + 1,
      mode: 'waiting',
      pet,
      doctor,
      appointmentTime: formatDateTime(setBusinessTime(REFERENCE_DATE, randomInt(8, 12), pick([0, 15, 30, 45]))),
    }))
  }

  for (let i = 0; i < todayCalledCount; i += 1) {
    const pet = nextPet()
    const doctor = doctors[i % doctors.length]
    plans.push(createAppointmentPlan({
      index: plans.length + 1,
      mode: 'called',
      pet,
      doctor,
      appointmentTime: formatDateTime(setBusinessTime(REFERENCE_DATE, randomInt(9, 13), pick([0, 20, 40]))),
    }))
  }

  for (let i = 0; i < todayConsultingCount; i += 1) {
    const pet = nextPet()
    const doctor = doctors[i % doctors.length]
    plans.push(createAppointmentPlan({
      index: plans.length + 1,
      mode: 'consulting',
      pet,
      doctor,
      appointmentTime: formatDateTime(setBusinessTime(REFERENCE_DATE, randomInt(10, 16), pick([0, 15, 30, 45]))),
      includeSoap: true,
    }))
  }

  const completedModes = [
    ...Array.from({ length: Math.max(0, completedCount - activeHospCount - dischargedHospCount - 26) }, () => 'completed'),
    ...Array.from({ length: 14 }, () => 'completed_rx'),
    ...Array.from({ length: 6 }, () => 'completed_lab'),
    ...Array.from({ length: 6 }, () => 'completed_lab_rx'),
    ...Array.from({ length: dischargedHospCount }, () => 'hosp_discharged'),
    ...Array.from({ length: activeHospCount }, () => 'hosp_active'),
  ]
  shuffleInPlace(completedModes)

  for (const mode of completedModes) {
    const pet = nextPet()
    const doctor = doctors[randomInt(0, doctors.length - 1)]
    const apptDate = dateAdd(REFERENCE_DATE, -randomInt(2, 75))
    const startTime = setBusinessTime(apptDate, randomInt(9, 18), pick([0, 15, 30, 45]))
    const endTime = new Date(startTime.getTime() + randomInt(18, 68) * 60 * 1000)
    plans.push(createAppointmentPlan({
      index: plans.length + 1,
      mode,
      pet,
      doctor,
      appointmentTime: formatDateTime(startTime),
      includeSoap: true,
      startTime,
      endTime,
      includeLab: ['completed_lab', 'completed_lab_rx', 'hosp_active', 'hosp_discharged'].includes(mode),
      includeRx: ['completed_rx', 'completed_lab_rx', 'hosp_active', 'hosp_discharged'].includes(mode),
      includeBilling: true,
      includeReminder: maybe(0.72),
      includeHospitalization: ['hosp_active', 'hosp_discharged'].includes(mode),
      dischargeHospitalization: mode === 'hosp_discharged',
    }))
  }

  return plans
}

function createAppointmentPlan(options) {
  const {
    index,
    mode,
    pet,
    doctor,
    appointmentTime,
    includeSoap = false,
    startTime,
    endTime,
    includeLab = false,
    includeRx = false,
    includeBilling = false,
    includeReminder = false,
    includeHospitalization = false,
    dischargeHospitalization = false,
  } = options

  const marker = `${DATASET_MARK}/APPT${String(index).padStart(4, '0')}`
  const reason = pick([
    '呕吐腹泻复诊',
    '食欲下降检查',
    '皮肤瘙痒复查',
    '疫苗免疫',
    '耳道炎复诊',
    '绝育术前检查',
    '慢病随访',
    '术后换药',
    '年度体检',
    '驱虫复查',
  ])
  const visitType = maybe(0.25) ? 'followup' : 'first'
  const soap = includeSoap
    ? buildSoapTemplate(reason, startTime, endTime)
    : null

  const lab = includeLab ? buildLabTemplate(startTime || REFERENCE_DATE) : null
  const hospitalization = includeHospitalization
    ? buildHospitalizationTemplate(startTime || REFERENCE_DATE, dischargeHospitalization)
    : null
  const reminder = includeReminder
    ? buildReminderTemplate(index, reason, endTime || startTime || REFERENCE_DATE)
    : null

  return {
    marker,
    mode,
    customerId: pet.customerId,
    petId: pet.id,
    doctorId: doctor.id,
    species: pet.species,
    visitType,
    reason: `${reason} ${index % 3 === 0 ? '（社区老客）' : ''}`.trim(),
    remark: `广东社区医院模拟预约 ${mode}`,
    appointmentTime,
    soap,
    lab,
    rx: includeRx ? { detailCount: randomInt(1, 3) } : null,
    billing: includeBilling
      ? {
          consultationFee: randomFloat(58, 188, 0),
          labFee: includeLab ? randomFloat(68, 238, 0) : 0,
          discount: maybe(0.18) ? randomFloat(10, 40, 0) : 0,
        }
      : null,
    payments: includeBilling
      ? {
          useMember: maybe(0.3),
        }
      : null,
    hospitalization,
    reminder,
  }
}

function buildSoapTemplate(reason, startTime, endTime) {
  const complaints = {
    呕吐腹泻复诊: ['近 2 天呕吐 2 次，软便，食欲下降', '腹泻 1 天，精神一般，饮水增加'],
    食欲下降检查: ['近 3 天食欲差，饮水减少，活动下降', '挑食明显，精神尚可，偶有呕吐'],
    皮肤瘙痒复查: ['反复抓挠耳廓及腹部，夜间明显', '皮肤红斑 1 周，偶有掉毛'],
    疫苗免疫: ['精神食欲正常，按计划到院免疫', '例行年度免疫，近期无异常'],
    耳道炎复诊: ['甩头抓耳，耳道分泌物增多', '耳道异味明显，外耳潮红'],
    绝育术前检查: ['术前评估，平时食欲精神正常', '预约绝育，需完成术前筛查'],
    慢病随访: ['既往慢性肠胃炎，近期偶有软便', '老年心肾监测复查'],
    术后换药: ['术后第 5 天复查切口，精神稳定', '伤口恢复中，需拆纱布换药'],
    年度体检: ['年度体检，无明显主诉', '例行健康检查，近期状态稳定'],
    驱虫复查: ['驱虫后复查粪便与精神状态', '按月驱虫复查，近期无异常'],
  }
  const physicalExam = pick([
    'T 38.8℃，CRT<2s，轻度脱水，腹部触诊轻敏',
    '精神一般，被毛粗糙，耳道分泌物增多，皮肤轻度红斑',
    '体温正常，心肺听诊未见明显异常，黏膜粉红',
    '切口干燥，周边无明显渗出，疼痛反应轻微',
  ])
  const treatmentPlan = pick([
    '对症治疗，必要时复查血常规与生化；居家观察食欲与排便',
    '维持当前治疗方案，3-5 天后复查，异常随时复诊',
    '加强皮肤护理，按时用药，避免舔咬患处',
    '完善术前检查后评估麻醉风险，确认禁食禁水安排',
  ])
  const doctorAdvice = pick([
    '建议清淡饮食，少量多餐，观察精神与排便变化',
    '按医嘱连续用药，不适加重需提前复诊',
    '保持耳道干燥，避免自行停药',
    '佩戴伊丽莎白圈，防止舔咬伤口',
  ])

  return {
    chiefComplaint: pick(complaints[reason] || complaints['年度体检']),
    physicalExam,
    treatmentPlan,
    doctorAdvice,
    startTime: startTime ? formatDateTime(startTime) : undefined,
    endTime: endTime ? formatDateTime(endTime) : undefined,
  }
}

function buildLabTemplate(baseDate) {
  const templates = [
    {
      testName: '血常规五分类',
      sampleType: 'blood',
      deviceCode: 'BC-5000',
      reportSummary: '白细胞轻度升高，提示炎症反应，建议结合临床继续观察',
      items: [
        { itemName: 'WBC', resultValue: String(randomFloat(13.2, 19.6, 1)), unit: '10^9/L', refMin: 5.5, refMax: 16.9 },
        { itemName: 'RBC', resultValue: String(randomFloat(5.5, 8.7, 1)), unit: '10^12/L', refMin: 5.5, refMax: 8.5 },
        { itemName: 'HGB', resultValue: String(randomFloat(114, 162, 0)), unit: 'g/L', refMin: 110, refMax: 180 },
      ],
    },
    {
      testName: '皮肤真菌镜检',
      sampleType: 'skin_scraping',
      deviceCode: 'MICRO-12',
      reportSummary: '未见明显真菌孢子，考虑炎性皮肤病可能，建议继续外用治疗',
      items: [
        { itemName: '真菌孢子', resultValue: '阴性', unit: '', flag: 'N' },
        { itemName: '螨虫检查', resultValue: '阴性', unit: '', flag: 'N' },
      ],
    },
    {
      testName: '粪便寄生虫检查',
      sampleType: 'feces',
      deviceCode: 'FEC-80',
      reportSummary: '未检出明显寄生虫卵，建议按月常规驱虫',
      items: [
        { itemName: '球虫', resultValue: '阴性', unit: '', flag: 'N' },
        { itemName: '蛔虫卵', resultValue: '阴性', unit: '', flag: 'N' },
      ],
    },
  ]
  const template = clone(pick(templates))
  const sampledAt = new Date(baseDate.getTime() + 10 * 60 * 1000)
  const reportedAt = new Date(baseDate.getTime() + 70 * 60 * 1000)
  return {
    ...template,
    sampledAt: formatDateTime(sampledAt),
    reportedAt: formatDateTime(reportedAt),
  }
}

function buildHospitalizationTemplate(baseDate, discharge) {
  const admissionAt = new Date(baseDate.getTime() + 30 * 60 * 1000)
  const dischargeAt = new Date(admissionAt.getTime() + randomInt(2, 5) * 24 * 60 * 60 * 1000)
  const nursingPlans = [
    {
      planType: 1,
      planName: '静脉补液',
      instruction: '按医嘱完成维持液补充',
      frequency: 'bid',
      scheduledTime: formatDateTime(new Date(admissionAt.getTime() + 2 * 60 * 60 * 1000)),
    },
    {
      planType: 3,
      planName: '生命体征监测',
      instruction: '监测体温、心率、呼吸与精神状态',
      frequency: 'q6h',
      scheduledTime: formatDateTime(new Date(admissionAt.getTime() + 4 * 60 * 60 * 1000)),
    },
    {
      planType: 2,
      planName: '处方粮喂养',
      instruction: '少量多餐，观察进食与呕吐情况',
      frequency: 'tid',
      scheduledTime: formatDateTime(new Date(admissionAt.getTime() + 6 * 60 * 60 * 1000)),
    },
  ]

  return {
    cageCode: `A-${randomInt(1, 9)}`,
    admissionAt: formatDateTime(admissionAt),
    dailyFee: randomFloat(180, 360, 0),
    depositAmount: randomFloat(500, 1500, 0),
    nursingLevel: randomInt(1, 3),
    remark: discharge ? '住院观察后可考虑出院' : '住院持续观察中',
    nursingPlans,
    discharge,
    dischargeAt: discharge ? formatDateTime(dischargeAt) : undefined,
    dischargeSummary: discharge ? '症状明显改善，精神食欲恢复，建议按时复查' : undefined,
  }
}

function buildReminderTemplate(index, reason, baseDate) {
  const dueDate = formatDate(dateAdd(baseDate, randomInt(7, 45)))
  const reminderTypes = [
    { type: 1, channel: 'wechat', name: '疫苗提醒' },
    { type: 2, channel: 'sms', name: '复诊提醒' },
    { type: 3, channel: 'phone', name: '用药提醒' },
    { type: 4, channel: 'wechat', name: '随访提醒' },
  ]
  const selected = pick(reminderTypes)
  return {
    marker: `${DATASET_MARK}/REM${String(index).padStart(4, '0')}`,
    type: selected.type,
    channel: selected.channel,
    reminderName: `${selected.name}-${reason}`,
    dueDate,
    remark: `广东社区医院自动生成${selected.name}`,
  }
}

function pickDiagnosis(diagnosisCodes, species) {
  const list = diagnosisCodes[species] || diagnosisCodes.other || []
  if (!list.length)
    return null
  const item = pick(list)
  return {
    code: item.code,
    name: item.name,
    type: 'confirmed',
  }
}

function pickPrescriptionDrugs(drugList, count) {
  const stocked = drugList.filter(item => Number(item.status || 1) === 1)
  return shuffle([...stocked]).slice(0, count)
}

function assistantNames(staffState) {
  return staffState.staffByPosition.assistant?.length
    ? staffState.staffByPosition.assistant
    : staffState.activeDoctors
}

function buildPetCountDistribution(customerCount, targetPetCount) {
  const counts = Array.from({ length: customerCount }, (_, index) => (index < 120 ? 1 : index < 200 ? 2 : 3))
  let total = counts.reduce((sum, item) => sum + item, 0)
  while (total > targetPetCount) {
    const index = counts.findIndex(item => item > 1)
    if (index === -1)
      break
    counts[index] -= 1
    total -= 1
  }
  while (total < targetPetCount) {
    const index = counts.findIndex(item => item < 3)
    if (index === -1)
      break
    counts[index] += 1
    total += 1
  }
  return counts
}

function uniquePetName(species, petIndex, sources) {
  const base = species === 'dog'
    ? pick(sources.dogNames)
    : species === 'cat'
      ? pick(sources.catNames)
      : pick(sources.otherNames)
  return petIndex === 0 ? base : `${base}${petIndex + 1}`
}

function petIdentity(pet) {
  return [pet.customerId, pet.name, pet.species, pet.breed].join('|')
}

function normalizeValue(value) {
  if (value === undefined || value === null || value === '')
    return null
  if (typeof value === 'number')
    return Number(value)
  return String(value)
}

function extractMarker(text) {
  if (!text)
    return null
  const match = String(text).match(/\[(.+?)\]/)
  return match ? match[1] : null
}

function groupBy(list, mapper) {
  return list.reduce((acc, item) => {
    const key = mapper(item)
    if (!acc[key])
      acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

function createPrng(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function randomInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min, max, digits = 2) {
  const value = min + rng() * (max - min)
  return Number(value.toFixed(digits))
}

function maybe(rate) {
  return rng() < rate
}

function pick(list) {
  return list[randomInt(0, list.length - 1)]
}

function weightedPick(options) {
  const total = options.reduce((sum, item) => sum + item.weight, 0)
  let pointer = rng() * total
  for (const option of options) {
    pointer -= option.weight
    if (pointer <= 0)
      return option.value
  }
  return options[options.length - 1].value
}

function shuffle(list) {
  const copy = [...list]
  shuffleInPlace(copy)
  return copy
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function dateAdd(date, dayOffset) {
  const value = new Date(date)
  value.setDate(value.getDate() + dayOffset)
  return value
}

function setBusinessTime(date, hour, minute) {
  const value = new Date(date)
  value.setHours(hour, minute, randomInt(0, 50), 0)
  return value
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateTime(date) {
  return `${formatDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}.000+08:00`
}

function randomDosage(unit) {
  if (unit === '片')
    return pick(['0.5 片', '1 片', '1.5 片'])
  if (unit === '支')
    return pick(['0.2 ml', '0.4 ml', '0.6 ml'])
  if (unit === '袋')
    return pick(['1 袋', '2 袋'])
  return pick(['1 次', '2 次'])
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function maybePauseBatch(progress, label) {
  if (progress > 0 && progress % BATCH_SIZE === 0) {
    console.log(`${logPrefix} ${label}已处理 ${progress} 条，暂停 ${BATCH_PAUSE_MS}ms 以平滑导入速率`)
    await sleep(BATCH_PAUSE_MS)
  }
}
