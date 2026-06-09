import { MigrationInterface, QueryRunner } from 'typeorm'

interface DictSeed {
  name: string
  code: string
  remark: string
  items?: Array<{
    label: string
    value: string
    remark: string
  }>
}

const ZH_DICT_SEEDS: DictSeed[] = [
  {
    name: '宠物物种',
    code: 'pet_species',
    remark: '犬、猫、兔、仓鼠等宠物物种分类',
    items: [
      { label: '犬', value: 'dog', remark: '宠物物种：犬' },
      { label: '猫', value: 'cat', remark: '宠物物种：猫' },
      { label: '兔', value: 'rabbit', remark: '宠物物种：兔' },
      { label: '仓鼠', value: 'hamster', remark: '宠物物种：仓鼠' },
      { label: '龙猫', value: 'chinchilla', remark: '宠物物种：龙猫' },
      { label: '豚鼠', value: 'guinea_pig', remark: '宠物物种：豚鼠' },
      { label: '鸟', value: 'bird', remark: '宠物物种：鸟' },
      { label: '龟', value: 'turtle', remark: '宠物物种：龟' },
      { label: '蛇', value: 'snake', remark: '宠物物种：蛇' },
      { label: '蜥蜴', value: 'lizard', remark: '宠物物种：蜥蜴' },
      { label: '其他', value: 'other', remark: '宠物物种：其他' },
    ],
  },
  {
    name: '犬品种',
    code: 'pet_breed_dog',
    remark: '常见犬品种列表',
    items: [
      { label: '金毛寻回犬', value: '金毛寻回犬', remark: '犬品种：金毛寻回犬' },
      { label: '拉布拉多', value: '拉布拉多', remark: '犬品种：拉布拉多' },
      { label: '泰迪/贵宾', value: '泰迪/贵宾', remark: '犬品种：泰迪/贵宾' },
      { label: '柯基', value: '柯基', remark: '犬品种：柯基' },
      { label: '哈士奇', value: '哈士奇', remark: '犬品种：哈士奇' },
      { label: '边境牧羊犬', value: '边境牧羊犬', remark: '犬品种：边境牧羊犬' },
      { label: '萨摩耶', value: '萨摩耶', remark: '犬品种：萨摩耶' },
      { label: '柴犬', value: '柴犬', remark: '犬品种：柴犬' },
      { label: '博美', value: '博美', remark: '犬品种：博美' },
      { label: '比熊', value: '比熊', remark: '犬品种：比熊' },
      { label: '法国斗牛犬', value: '法国斗牛犬', remark: '犬品种：法国斗牛犬' },
      { label: '中华田园犬', value: '中华田园犬', remark: '犬品种：中华田园犬' },
    ],
  },
  {
    name: '猫品种',
    code: 'pet_breed_cat',
    remark: '常见猫品种列表',
    items: [
      { label: '英国短毛猫', value: '英国短毛猫', remark: '猫品种：英国短毛猫' },
      { label: '美国短毛猫', value: '美国短毛猫', remark: '猫品种：美国短毛猫' },
      { label: '布偶猫', value: '布偶猫', remark: '猫品种：布偶猫' },
      { label: '暹罗猫', value: '暹罗猫', remark: '猫品种：暹罗猫' },
      { label: '中华田园猫', value: '中华田园猫', remark: '猫品种：中华田园猫' },
      { label: '缅因猫', value: '缅因猫', remark: '猫品种：缅因猫' },
      { label: '波斯猫', value: '波斯猫', remark: '猫品种：波斯猫' },
      { label: '苏格兰折耳猫', value: '苏格兰折耳猫', remark: '猫品种：苏格兰折耳猫' },
    ],
  },
  {
    name: '兽医诊断编码(ICD-CA)',
    code: 'vet_diagnosis',
    remark: 'ICD-CA 兽医临床诊断编码',
  },
  {
    name: '宠物性别',
    code: 'pet_gender',
    remark: '宠物性别选项',
    items: [
      { label: '公', value: '1', remark: '宠物性别：公' },
      { label: '母', value: '2', remark: '宠物性别：母' },
    ],
  },
  {
    name: '宠物绝育状态',
    code: 'pet_neutered',
    remark: '宠物绝育状态选项',
    items: [
      { label: '未绝育', value: '0', remark: '宠物绝育状态：未绝育' },
      { label: '已绝育', value: '1', remark: '宠物绝育状态：已绝育' },
    ],
  },
  {
    name: '宠物居住环境',
    code: 'pet_living_environment',
    remark: '宠物居住环境选项',
    items: [
      { label: '室内', value: '1', remark: '宠物居住环境：室内' },
      { label: '室外', value: '2', remark: '宠物居住环境：室外' },
      { label: '混合', value: '3', remark: '宠物居住环境：混合' },
    ],
  },
  {
    name: '宠物繁殖状态',
    code: 'pet_reproductive_status',
    remark: '宠物繁殖状态选项',
    items: [
      { label: '未繁育', value: '1', remark: '宠物繁殖状态：未繁育' },
      { label: '繁育中', value: '2', remark: '宠物繁殖状态：繁育中' },
      { label: '怀孕期', value: '4', remark: '宠物繁殖状态：怀孕期' },
      { label: '哺乳期', value: '5', remark: '宠物繁殖状态：哺乳期' },
    ],
  },
  {
    name: '就诊类型',
    code: 'pet_visit_type',
    remark: '预约就诊类型选项',
    items: [
      { label: '初诊', value: 'first', remark: '就诊类型：初诊' },
      { label: '复诊', value: 'followup', remark: '就诊类型：复诊' },
    ],
  },
  {
    name: '医生科室',
    code: 'vpet_doctor_department',
    remark: '医生科室选项',
    items: [
      { label: '内科', value: 'internal', remark: '医生科室：内科' },
      { label: '外科', value: 'surgery', remark: '医生科室：外科' },
      { label: '皮肤科', value: 'dermatology', remark: '医生科室：皮肤科' },
      { label: '眼科', value: 'ophthalmology', remark: '医生科室：眼科' },
      { label: '急诊', value: 'emergency', remark: '医生科室：急诊' },
      { label: '体检科', value: 'checkup', remark: '医生科室：体检科' },
    ],
  },
  {
    name: '预约状态',
    code: 'vpet_appointment_status',
    remark: '预约状态选项',
    items: [
      { label: '已预约', value: '1', remark: '预约状态：已预约' },
      { label: '已签到', value: '2', remark: '预约状态：已签到' },
      { label: '已完成', value: '3', remark: '预约状态：已完成' },
      { label: '已取消', value: '4', remark: '预约状态：已取消' },
    ],
  },
  {
    name: '就诊状态',
    code: 'vpet_visit_status',
    remark: '就诊状态选项',
    items: [
      { label: '待接诊', value: '1', remark: '就诊状态：待接诊' },
      { label: '已叫号', value: '2', remark: '就诊状态：已叫号' },
      { label: '接诊中', value: '3', remark: '就诊状态：接诊中' },
      { label: '已结束', value: '4', remark: '就诊状态：已结束' },
      { label: '过号', value: '6', remark: '就诊状态：过号' },
    ],
  },
  {
    name: '支付方式',
    code: 'vpet_payment_method',
    remark: '收费支付方式选项',
    items: [
      { label: '微信', value: '1', remark: '支付方式：微信' },
      { label: '支付宝', value: '2', remark: '支付方式：支付宝' },
      { label: '现金', value: '3', remark: '支付方式：现金' },
      { label: '会员卡', value: '4', remark: '支付方式：会员卡' },
      { label: '组合支付', value: '5', remark: '支付方式：组合支付' },
    ],
  },
  {
    name: '支付状态',
    code: 'vpet_payment_status',
    remark: '收费支付状态选项',
    items: [
      { label: '待支付', value: '1', remark: '支付状态：待支付' },
      { label: '部分支付', value: '2', remark: '支付状态：部分支付' },
      { label: '已支付', value: '3', remark: '支付状态：已支付' },
      { label: '已退款', value: '4', remark: '支付状态：已退款' },
      { label: '部分退款', value: '5', remark: '支付状态：部分退款' },
    ],
  },
  {
    name: '医生状态',
    code: 'vpet_doctor_status',
    remark: '医生启用状态选项',
    items: [
      { label: '停用', value: '0', remark: '医生状态：停用' },
      { label: '启用', value: '1', remark: '医生状态：启用' },
    ],
  },
  {
    name: '检验状态',
    code: 'vpet_lab_status',
    remark: '检验单状态选项',
    items: [
      { label: '已开单', value: '1', remark: '检验状态：已开单' },
      { label: '已采样', value: '2', remark: '检验状态：已采样' },
      { label: '已出报告', value: '4', remark: '检验状态：已出报告' },
    ],
  },
  {
    name: '住院状态',
    code: 'vpet_hospitalization_status',
    remark: '住院状态选项',
    items: [
      { label: '住院中', value: '1', remark: '住院状态：住院中' },
      { label: '已出院', value: '2', remark: '住院状态：已出院' },
    ],
  },
  {
    name: '提醒类型',
    code: 'vpet_reminder_type',
    remark: '提醒类型选项',
    items: [
      { label: '疫苗提醒', value: '1', remark: '提醒类型：疫苗提醒' },
      { label: '复诊提醒', value: '2', remark: '提醒类型：复诊提醒' },
      { label: '用药提醒', value: '3', remark: '提醒类型：用药提醒' },
      { label: '随访提醒', value: '4', remark: '提醒类型：随访提醒' },
    ],
  },
  {
    name: '提醒渠道',
    code: 'vpet_reminder_channel',
    remark: '提醒渠道选项',
    items: [
      { label: '电话', value: 'phone', remark: '提醒渠道：电话' },
      { label: '短信', value: 'sms', remark: '提醒渠道：短信' },
      { label: '微信', value: 'wechat', remark: '提醒渠道：微信' },
      { label: '邮箱', value: 'email', remark: '提醒渠道：邮箱' },
    ],
  },
  {
    name: '提醒状态',
    code: 'vpet_reminder_status',
    remark: '提醒状态选项',
    items: [
      { label: '待提醒', value: '1', remark: '提醒状态：待提醒' },
      { label: '已提醒', value: '2', remark: '提醒状态：已提醒' },
      { label: '已完成', value: '3', remark: '提醒状态：已完成' },
      { label: '已取消', value: '4', remark: '提醒状态：已取消' },
    ],
  },
  {
    name: '检验样本类型',
    code: 'vpet_lab_sample_type',
    remark: '检验样本类型选项',
    items: [
      { label: '血液', value: 'blood', remark: '检验样本类型：血液' },
      { label: '尿液', value: 'urine', remark: '检验样本类型：尿液' },
      { label: '粪便', value: 'feces', remark: '检验样本类型：粪便' },
      { label: '皮肤刮片', value: 'skin_scraping', remark: '检验样本类型：皮肤刮片' },
      { label: '其他', value: 'other', remark: '检验样本类型：其他' },
    ],
  },
  {
    name: '保险理赔状态',
    code: 'vpet_insurance_status',
    remark: '保险理赔状态选项',
    items: [
      { label: '草稿', value: '1', remark: '保险理赔状态：草稿' },
      { label: '已提交', value: '2', remark: '保险理赔状态：已提交' },
      { label: '已结案', value: '3', remark: '保险理赔状态：已结案' },
    ],
  },
  {
    name: '护理等级',
    code: 'vpet_nursing_level',
    remark: '住院护理等级选项',
    items: [
      { label: '常规护理', value: '1', remark: '护理等级：常规护理' },
      { label: '加强护理', value: '2', remark: '护理等级：加强护理' },
      { label: '重症护理', value: '3', remark: '护理等级：重症护理' },
    ],
  },
  {
    name: '护理计划类型',
    code: 'vpet_nursing_plan_type',
    remark: '住院护理计划类型选项',
    items: [
      { label: '用药', value: '1', remark: '护理计划类型：用药' },
      { label: '喂养', value: '2', remark: '护理计划类型：喂养' },
      { label: '监测', value: '3', remark: '护理计划类型：监测' },
      { label: '治疗', value: '4', remark: '护理计划类型：治疗' },
    ],
  },
  {
    name: '调拨状态',
    code: 'vpet_transfer_status',
    remark: '药品调拨状态选项',
    items: [
      { label: '待审批', value: '1', remark: '调拨状态：待审批' },
      { label: '已审批', value: '2', remark: '调拨状态：已审批' },
      { label: '已完成', value: '3', remark: '调拨状态：已完成' },
    ],
  },
  {
    name: '药品批次状态',
    code: 'vpet_pharmacy_batch_status',
    remark: '药品批次状态选项',
    items: [
      { label: '在库', value: '1', remark: '药品批次状态：在库' },
      { label: '近效期', value: '2', remark: '药品批次状态：近效期' },
      { label: '已过期', value: '3', remark: '药品批次状态：已过期' },
    ],
  },
  {
    name: '处方状态',
    code: 'vpet_prescription_status',
    remark: '处方状态选项',
    items: [
      { label: '草稿', value: '1', remark: '处方状态：草稿' },
      { label: '待审核', value: '2', remark: '处方状态：待审核' },
      { label: '已审核', value: '3', remark: '处方状态：已审核' },
      { label: '已发药', value: '4', remark: '处方状态：已发药' },
      { label: '已作废', value: '5', remark: '处方状态：已作废' },
    ],
  },
  {
    name: '宠物状态',
    code: 'vpet_pet_status',
    remark: '宠物状态选项',
    items: [
      { label: '正常', value: '1', remark: '宠物状态：正常' },
      { label: '住院中', value: '2', remark: '宠物状态：住院中' },
      { label: '安乐', value: '3', remark: '宠物状态：安乐' },
      { label: '已死亡', value: '4', remark: '宠物状态：已死亡' },
    ],
  },
  {
    name: '药品状态',
    code: 'vpet_pharmacy_status',
    remark: '药房药品状态选项',
    items: [
      { label: '停用', value: '0', remark: '药品状态：停用' },
      { label: '启用', value: '1', remark: '药品状态：启用' },
    ],
  },
  {
    name: '宠物生命阶段',
    code: 'pet_life_stage',
    remark: '宠物生命阶段选项',
    items: [
      { label: '幼年', value: '1', remark: '宠物生命阶段：幼年' },
      { label: '成年', value: '2', remark: '宠物生命阶段：成年' },
      { label: '老年', value: '3', remark: '宠物生命阶段：老年' },
    ],
  },
  {
    name: '队列事件类型',
    code: 'vpet_queue_event_type',
    remark: '就诊队列事件类型选项',
    items: [
      { label: '签到入队', value: '1', remark: '队列事件类型：签到入队' },
      { label: '医生叫号', value: '2', remark: '队列事件类型：医生叫号' },
      { label: '开始接诊', value: '3', remark: '队列事件类型：开始接诊' },
      { label: '结束就诊', value: '4', remark: '队列事件类型：结束就诊' },
      { label: '过号', value: '5', remark: '队列事件类型：过号' },
    ],
  },
  {
    name: '护理执行状态',
    code: 'vpet_nursing_execution_status',
    remark: '住院护理执行状态选项',
    items: [
      { label: '待执行', value: '1', remark: '护理执行状态：待执行' },
      { label: '已执行', value: '2', remark: '护理执行状态：已执行' },
    ],
  },
]

const EN_VPET_DICT_SEEDS: DictSeed[] = [
  {
    name: 'Pet Gender',
    code: 'pet_gender',
    remark: 'Pet gender options',
    items: [
      { label: 'Male', value: '1', remark: 'Pet gender options' },
      { label: 'Female', value: '2', remark: 'Pet gender options' },
    ],
  },
  {
    name: 'Pet Neutered',
    code: 'pet_neutered',
    remark: 'Pet neutered options',
    items: [
      { label: 'Not neutered', value: '0', remark: 'Pet neutered options' },
      { label: 'Neutered', value: '1', remark: 'Pet neutered options' },
    ],
  },
  {
    name: 'Pet Living Environment',
    code: 'pet_living_environment',
    remark: 'Pet living environment options',
    items: [
      { label: 'Indoor', value: '1', remark: 'Pet living environment options' },
      { label: 'Outdoor', value: '2', remark: 'Pet living environment options' },
      { label: 'Mixed', value: '3', remark: 'Pet living environment options' },
    ],
  },
  {
    name: 'Pet Reproductive Status',
    code: 'pet_reproductive_status',
    remark: 'Pet reproductive status options',
    items: [
      { label: 'Not bred', value: '1', remark: 'Pet reproductive status options' },
      { label: 'Breeding', value: '2', remark: 'Pet reproductive status options' },
      { label: 'Pregnant', value: '4', remark: 'Pet reproductive status options' },
      { label: 'Lactating', value: '5', remark: 'Pet reproductive status options' },
    ],
  },
  {
    name: 'Visit Type',
    code: 'pet_visit_type',
    remark: 'Appointment visit type options',
    items: [
      { label: 'First visit', value: 'first', remark: 'Appointment visit type options' },
      { label: 'Follow-up', value: 'followup', remark: 'Appointment visit type options' },
    ],
  },
  {
    name: 'Doctor Department',
    code: 'vpet_doctor_department',
    remark: 'Doctor department options',
    items: [
      { label: 'Internal medicine', value: 'internal', remark: 'Doctor department options' },
      { label: 'Surgery', value: 'surgery', remark: 'Doctor department options' },
      { label: 'Dermatology', value: 'dermatology', remark: 'Doctor department options' },
      { label: 'Ophthalmology', value: 'ophthalmology', remark: 'Doctor department options' },
      { label: 'Emergency', value: 'emergency', remark: 'Doctor department options' },
      { label: 'Checkup', value: 'checkup', remark: 'Doctor department options' },
    ],
  },
  {
    name: 'Appointment Status',
    code: 'vpet_appointment_status',
    remark: 'Appointment status options',
    items: [
      { label: 'Booked', value: '1', remark: 'Appointment status options' },
      { label: 'Checked in', value: '2', remark: 'Appointment status options' },
      { label: 'Completed', value: '3', remark: 'Appointment status options' },
      { label: 'Cancelled', value: '4', remark: 'Appointment status options' },
    ],
  },
  {
    name: 'Visit Status',
    code: 'vpet_visit_status',
    remark: 'Visit status options',
    items: [
      { label: 'Waiting', value: '1', remark: 'Visit status options' },
      { label: 'Called', value: '2', remark: 'Visit status options' },
      { label: 'In consultation', value: '3', remark: 'Visit status options' },
      { label: 'Finished', value: '4', remark: 'Visit status options' },
      { label: 'Missed', value: '6', remark: 'Visit status options' },
    ],
  },
  {
    name: 'Payment Method',
    code: 'vpet_payment_method',
    remark: 'Billing payment method options',
    items: [
      { label: 'WeChat', value: '1', remark: 'Billing payment method options' },
      { label: 'Alipay', value: '2', remark: 'Billing payment method options' },
      { label: 'Cash', value: '3', remark: 'Billing payment method options' },
      { label: 'Member card', value: '4', remark: 'Billing payment method options' },
      { label: 'Combined', value: '5', remark: 'Billing payment method options' },
    ],
  },
  {
    name: 'Payment Status',
    code: 'vpet_payment_status',
    remark: 'Billing payment status options',
    items: [
      { label: 'Pending', value: '1', remark: 'Billing payment status options' },
      { label: 'Partial', value: '2', remark: 'Billing payment status options' },
      { label: 'Paid', value: '3', remark: 'Billing payment status options' },
      { label: 'Refunded', value: '4', remark: 'Billing payment status options' },
      { label: 'Partially refunded', value: '5', remark: 'Billing payment status options' },
    ],
  },
  {
    name: 'Doctor Status',
    code: 'vpet_doctor_status',
    remark: 'Doctor active status options',
    items: [
      { label: 'Inactive', value: '0', remark: 'Doctor active status options' },
      { label: 'Active', value: '1', remark: 'Doctor active status options' },
    ],
  },
  {
    name: 'Lab Status',
    code: 'vpet_lab_status',
    remark: 'Lab order status options',
    items: [
      { label: 'Requested', value: '1', remark: 'Lab order status options' },
      { label: 'Sampled', value: '2', remark: 'Lab order status options' },
      { label: 'Reported', value: '4', remark: 'Lab order status options' },
    ],
  },
  {
    name: 'Hospitalization Status',
    code: 'vpet_hospitalization_status',
    remark: 'Hospitalization status options',
    items: [
      { label: 'Hospitalized', value: '1', remark: 'Hospitalization status options' },
      { label: 'Discharged', value: '2', remark: 'Hospitalization status options' },
    ],
  },
  {
    name: 'Reminder Type',
    code: 'vpet_reminder_type',
    remark: 'Reminder type options',
    items: [
      { label: 'Vaccination', value: '1', remark: 'Reminder type options' },
      { label: 'Revisit', value: '2', remark: 'Reminder type options' },
      { label: 'Medication', value: '3', remark: 'Reminder type options' },
      { label: 'Follow-up', value: '4', remark: 'Reminder type options' },
    ],
  },
  {
    name: 'Reminder Channel',
    code: 'vpet_reminder_channel',
    remark: 'Reminder channel options',
    items: [
      { label: 'Phone', value: 'phone', remark: 'Reminder channel options' },
      { label: 'SMS', value: 'sms', remark: 'Reminder channel options' },
      { label: 'WeChat', value: 'wechat', remark: 'Reminder channel options' },
      { label: 'Email', value: 'email', remark: 'Reminder channel options' },
    ],
  },
  {
    name: 'Reminder Status',
    code: 'vpet_reminder_status',
    remark: 'Reminder status options',
    items: [
      { label: 'Pending', value: '1', remark: 'Reminder status options' },
      { label: 'Reminded', value: '2', remark: 'Reminder status options' },
      { label: 'Completed', value: '3', remark: 'Reminder status options' },
      { label: 'Cancelled', value: '4', remark: 'Reminder status options' },
    ],
  },
  {
    name: 'Lab Sample Type',
    code: 'vpet_lab_sample_type',
    remark: 'Lab sample type options',
    items: [
      { label: 'Blood', value: 'blood', remark: 'Lab sample type options' },
      { label: 'Urine', value: 'urine', remark: 'Lab sample type options' },
      { label: 'Feces', value: 'feces', remark: 'Lab sample type options' },
      { label: 'Skin scraping', value: 'skin_scraping', remark: 'Lab sample type options' },
      { label: 'Other', value: 'other', remark: 'Lab sample type options' },
    ],
  },
  {
    name: 'Insurance Status',
    code: 'vpet_insurance_status',
    remark: 'Insurance claim status options',
    items: [
      { label: 'Draft', value: '1', remark: 'Insurance claim status options' },
      { label: 'Submitted', value: '2', remark: 'Insurance claim status options' },
      { label: 'Settled', value: '3', remark: 'Insurance claim status options' },
    ],
  },
  {
    name: 'Nursing Level',
    code: 'vpet_nursing_level',
    remark: 'Hospitalization nursing level options',
    items: [
      { label: 'Routine', value: '1', remark: 'Hospitalization nursing level options' },
      { label: 'Enhanced', value: '2', remark: 'Hospitalization nursing level options' },
      { label: 'Critical', value: '3', remark: 'Hospitalization nursing level options' },
    ],
  },
  {
    name: 'Nursing Plan Type',
    code: 'vpet_nursing_plan_type',
    remark: 'Hospitalization nursing plan type options',
    items: [
      { label: 'Medication', value: '1', remark: 'Hospitalization nursing plan type options' },
      { label: 'Feeding', value: '2', remark: 'Hospitalization nursing plan type options' },
      { label: 'Monitoring', value: '3', remark: 'Hospitalization nursing plan type options' },
      { label: 'Treatment', value: '4', remark: 'Hospitalization nursing plan type options' },
    ],
  },
  {
    name: 'Transfer Status',
    code: 'vpet_transfer_status',
    remark: 'Drug transfer status options',
    items: [
      { label: 'Pending approval', value: '1', remark: 'Drug transfer status options' },
      { label: 'Approved', value: '2', remark: 'Drug transfer status options' },
      { label: 'Completed', value: '3', remark: 'Drug transfer status options' },
    ],
  },
  {
    name: 'Pharmacy Batch Status',
    code: 'vpet_pharmacy_batch_status',
    remark: 'Pharmacy batch status options',
    items: [
      { label: 'In stock', value: '1', remark: 'Pharmacy batch status options' },
      { label: 'Near expiry', value: '2', remark: 'Pharmacy batch status options' },
      { label: 'Expired', value: '3', remark: 'Pharmacy batch status options' },
    ],
  },
  {
    name: 'Prescription Status',
    code: 'vpet_prescription_status',
    remark: 'Prescription status options',
    items: [
      { label: 'Draft', value: '1', remark: 'Prescription status options' },
      { label: 'Pending review', value: '2', remark: 'Prescription status options' },
      { label: 'Reviewed', value: '3', remark: 'Prescription status options' },
      { label: 'Dispensed', value: '4', remark: 'Prescription status options' },
      { label: 'Voided', value: '5', remark: 'Prescription status options' },
    ],
  },
  {
    name: 'Pet Status',
    code: 'vpet_pet_status',
    remark: 'Pet status options',
    items: [
      { label: 'Normal', value: '1', remark: 'Pet status options' },
      { label: 'Hospitalized', value: '2', remark: 'Pet status options' },
      { label: 'Euthanasia', value: '3', remark: 'Pet status options' },
      { label: 'Deceased', value: '4', remark: 'Pet status options' },
    ],
  },
  {
    name: 'Pharmacy Drug Status',
    code: 'vpet_pharmacy_status',
    remark: 'Pharmacy drug status options',
    items: [
      { label: 'Disabled', value: '0', remark: 'Pharmacy drug status options' },
      { label: 'Active', value: '1', remark: 'Pharmacy drug status options' },
    ],
  },
  {
    name: 'Pet Life Stage',
    code: 'pet_life_stage',
    remark: 'Pet life stage options',
    items: [
      { label: 'Juvenile', value: '1', remark: 'Pet life stage options' },
      { label: 'Adult', value: '2', remark: 'Pet life stage options' },
      { label: 'Senior', value: '3', remark: 'Pet life stage options' },
    ],
  },
  {
    name: 'Visit Queue Event Type',
    code: 'vpet_queue_event_type',
    remark: 'Visit queue event type options',
    items: [
      { label: 'Checked into queue', value: '1', remark: 'Visit queue event type options' },
      { label: 'Called by doctor', value: '2', remark: 'Visit queue event type options' },
      { label: 'Consultation started', value: '3', remark: 'Visit queue event type options' },
      { label: 'Consultation ended', value: '4', remark: 'Visit queue event type options' },
      { label: 'Missed', value: '5', remark: 'Visit queue event type options' },
    ],
  },
  {
    name: 'Nursing Execution Status',
    code: 'vpet_nursing_execution_status',
    remark: 'Hospitalization nursing execution status options',
    items: [
      { label: 'Pending', value: '1', remark: 'Hospitalization nursing execution status options' },
      { label: 'Executed', value: '2', remark: 'Hospitalization nursing execution status options' },
    ],
  },
]

async function applyDictSeeds(queryRunner: QueryRunner, dictSeeds: DictSeed[]): Promise<void> {
  for (const dict of dictSeeds) {
    await queryRunner.query(
      `
        UPDATE sys_dict_type
        SET name = ?, remark = ?, updated_at = NOW()
        WHERE code = ?
      `,
      [dict.name, dict.remark, dict.code],
    )

    for (const item of dict.items ?? []) {
      await queryRunner.query(
        `
          UPDATE sys_dict_item i
          INNER JOIN sys_dict_type t ON t.id = i.type_id
          SET i.label = ?, i.remark = ?, i.updated_at = NOW()
          WHERE t.code = ? AND i.value = ?
        `,
        [item.label, item.remark, dict.code, item.value],
      )
    }
  }
}

export class LocalizeVpetDictsToZhCn1718000000003 implements MigrationInterface {
  name = 'LocalizeVpetDictsToZhCn1718000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyDictSeeds(queryRunner, ZH_DICT_SEEDS)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await applyDictSeeds(queryRunner, EN_VPET_DICT_SEEDS)
    await applyDictSeeds(
      queryRunner,
      ZH_DICT_SEEDS.filter(dict =>
        ['pet_species', 'pet_breed_dog', 'pet_breed_cat', 'vet_diagnosis'].includes(dict.code),
      ),
    )
  }
}
