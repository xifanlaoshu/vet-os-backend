import { MigrationInterface, QueryRunner } from 'typeorm'

interface DictSeed {
  name: string
  code: string
  remark: string
  items: Array<{
    label: string
    value: string
    orderNo: number
    remark: string
  }>
}

const DICT_SEEDS: DictSeed[] = [
  {
    name: '宠物性别',
    code: 'pet_gender',
    remark: '宠物性别选项',
    items: [
      { label: '公', value: '1', orderNo: 1, remark: '宠物性别：公' },
      { label: '母', value: '2', orderNo: 2, remark: '宠物性别：母' },
    ],
  },
  {
    name: '宠物绝育状态',
    code: 'pet_neutered',
    remark: '宠物绝育状态选项',
    items: [
      { label: '未绝育', value: '0', orderNo: 1, remark: '宠物绝育状态：未绝育' },
      { label: '已绝育', value: '1', orderNo: 2, remark: '宠物绝育状态：已绝育' },
    ],
  },
  {
    name: '宠物居住环境',
    code: 'pet_living_environment',
    remark: '宠物居住环境选项',
    items: [
      { label: '室内', value: '1', orderNo: 1, remark: '宠物居住环境：室内' },
      { label: '室外', value: '2', orderNo: 2, remark: '宠物居住环境：室外' },
      { label: '混合', value: '3', orderNo: 3, remark: '宠物居住环境：混合' },
    ],
  },
  {
    name: '宠物繁殖状态',
    code: 'pet_reproductive_status',
    remark: '宠物繁殖状态选项',
    items: [
      { label: '未繁育', value: '1', orderNo: 1, remark: '宠物繁殖状态：未繁育' },
      { label: '繁育中', value: '2', orderNo: 2, remark: '宠物繁殖状态：繁育中' },
      { label: '怀孕期', value: '4', orderNo: 4, remark: '宠物繁殖状态：怀孕期' },
      { label: '哺乳期', value: '5', orderNo: 5, remark: '宠物繁殖状态：哺乳期' },
    ],
  },
  {
    name: '就诊类型',
    code: 'pet_visit_type',
    remark: '预约就诊类型选项',
    items: [
      { label: '初诊', value: 'first', orderNo: 1, remark: '就诊类型：初诊' },
      { label: '复诊', value: 'followup', orderNo: 2, remark: '就诊类型：复诊' },
    ],
  },
  {
    name: '医生科室',
    code: 'vpet_doctor_department',
    remark: '医生科室选项',
    items: [
      { label: '内科', value: 'internal', orderNo: 1, remark: '医生科室：内科' },
      { label: '外科', value: 'surgery', orderNo: 2, remark: '医生科室：外科' },
      { label: '皮肤科', value: 'dermatology', orderNo: 3, remark: '医生科室：皮肤科' },
      { label: '眼科', value: 'ophthalmology', orderNo: 4, remark: '医生科室：眼科' },
      { label: '急诊', value: 'emergency', orderNo: 5, remark: '医生科室：急诊' },
      { label: '体检科', value: 'checkup', orderNo: 6, remark: '医生科室：体检科' },
    ],
  },
  {
    name: '预约状态',
    code: 'vpet_appointment_status',
    remark: '预约状态选项',
    items: [
      { label: '已预约', value: '1', orderNo: 1, remark: '预约状态：已预约' },
      { label: '已签到', value: '2', orderNo: 2, remark: '预约状态：已签到' },
      { label: '已完成', value: '3', orderNo: 3, remark: '预约状态：已完成' },
      { label: '已取消', value: '4', orderNo: 4, remark: '预约状态：已取消' },
    ],
  },
  {
    name: '就诊状态',
    code: 'vpet_visit_status',
    remark: '就诊状态选项',
    items: [
      { label: '待接诊', value: '1', orderNo: 1, remark: '就诊状态：待接诊' },
      { label: '已叫号', value: '2', orderNo: 2, remark: '就诊状态：已叫号' },
      { label: '接诊中', value: '3', orderNo: 3, remark: '就诊状态：接诊中' },
      { label: '已结束', value: '4', orderNo: 4, remark: '就诊状态：已结束' },
      { label: '过号', value: '6', orderNo: 6, remark: '就诊状态：过号' },
    ],
  },
  {
    name: '支付方式',
    code: 'vpet_payment_method',
    remark: '收费支付方式选项',
    items: [
      { label: '微信', value: '1', orderNo: 1, remark: '支付方式：微信' },
      { label: '支付宝', value: '2', orderNo: 2, remark: '支付方式：支付宝' },
      { label: '现金', value: '3', orderNo: 3, remark: '支付方式：现金' },
      { label: '会员卡', value: '4', orderNo: 4, remark: '支付方式：会员卡' },
      { label: '组合支付', value: '5', orderNo: 5, remark: '支付方式：组合支付' },
    ],
  },
  {
    name: '支付状态',
    code: 'vpet_payment_status',
    remark: '收费支付状态选项',
    items: [
      { label: '待支付', value: '1', orderNo: 1, remark: '支付状态：待支付' },
      { label: '部分支付', value: '2', orderNo: 2, remark: '支付状态：部分支付' },
      { label: '已支付', value: '3', orderNo: 3, remark: '支付状态：已支付' },
      { label: '已退款', value: '4', orderNo: 4, remark: '支付状态：已退款' },
      { label: '部分退款', value: '5', orderNo: 5, remark: '支付状态：部分退款' },
    ],
  },
  {
    name: '医生状态',
    code: 'vpet_doctor_status',
    remark: '医生启用状态选项',
    items: [
      { label: '停用', value: '0', orderNo: 1, remark: '医生状态：停用' },
      { label: '启用', value: '1', orderNo: 2, remark: '医生状态：启用' },
    ],
  },
  {
    name: '检验状态',
    code: 'vpet_lab_status',
    remark: '检验单状态选项',
    items: [
      { label: '已开单', value: '1', orderNo: 1, remark: '检验状态：已开单' },
      { label: '已采样', value: '2', orderNo: 2, remark: '检验状态：已采样' },
      { label: '已出报告', value: '4', orderNo: 4, remark: '检验状态：已出报告' },
    ],
  },
  {
    name: '住院状态',
    code: 'vpet_hospitalization_status',
    remark: '住院状态选项',
    items: [
      { label: '住院中', value: '1', orderNo: 1, remark: '住院状态：住院中' },
      { label: '已出院', value: '2', orderNo: 2, remark: '住院状态：已出院' },
    ],
  },
  {
    name: '提醒类型',
    code: 'vpet_reminder_type',
    remark: '提醒类型选项',
    items: [
      { label: '疫苗提醒', value: '1', orderNo: 1, remark: '提醒类型：疫苗提醒' },
      { label: '复诊提醒', value: '2', orderNo: 2, remark: '提醒类型：复诊提醒' },
      { label: '用药提醒', value: '3', orderNo: 3, remark: '提醒类型：用药提醒' },
      { label: '随访提醒', value: '4', orderNo: 4, remark: '提醒类型：随访提醒' },
    ],
  },
  {
    name: '提醒渠道',
    code: 'vpet_reminder_channel',
    remark: '提醒渠道选项',
    items: [
      { label: '电话', value: 'phone', orderNo: 1, remark: '提醒渠道：电话' },
      { label: '短信', value: 'sms', orderNo: 2, remark: '提醒渠道：短信' },
      { label: '微信', value: 'wechat', orderNo: 3, remark: '提醒渠道：微信' },
      { label: '邮箱', value: 'email', orderNo: 4, remark: '提醒渠道：邮箱' },
    ],
  },
  {
    name: '提醒状态',
    code: 'vpet_reminder_status',
    remark: '提醒状态选项',
    items: [
      { label: '待提醒', value: '1', orderNo: 1, remark: '提醒状态：待提醒' },
      { label: '已提醒', value: '2', orderNo: 2, remark: '提醒状态：已提醒' },
      { label: '已完成', value: '3', orderNo: 3, remark: '提醒状态：已完成' },
      { label: '已取消', value: '4', orderNo: 4, remark: '提醒状态：已取消' },
    ],
  },
  {
    name: '检验样本类型',
    code: 'vpet_lab_sample_type',
    remark: '检验样本类型选项',
    items: [
      { label: '血液', value: 'blood', orderNo: 1, remark: '检验样本类型：血液' },
      { label: '尿液', value: 'urine', orderNo: 2, remark: '检验样本类型：尿液' },
      { label: '粪便', value: 'feces', orderNo: 3, remark: '检验样本类型：粪便' },
      { label: '皮肤刮片', value: 'skin_scraping', orderNo: 4, remark: '检验样本类型：皮肤刮片' },
      { label: '其他', value: 'other', orderNo: 99, remark: '检验样本类型：其他' },
    ],
  },
  {
    name: '保险理赔状态',
    code: 'vpet_insurance_status',
    remark: '保险理赔状态选项',
    items: [
      { label: '草稿', value: '1', orderNo: 1, remark: '保险理赔状态：草稿' },
      { label: '已提交', value: '2', orderNo: 2, remark: '保险理赔状态：已提交' },
      { label: '已结案', value: '3', orderNo: 3, remark: '保险理赔状态：已结案' },
    ],
  },
  {
    name: '护理等级',
    code: 'vpet_nursing_level',
    remark: '住院护理等级选项',
    items: [
      { label: '常规护理', value: '1', orderNo: 1, remark: '护理等级：常规护理' },
      { label: '加强护理', value: '2', orderNo: 2, remark: '护理等级：加强护理' },
      { label: '重症护理', value: '3', orderNo: 3, remark: '护理等级：重症护理' },
    ],
  },
  {
    name: '护理计划类型',
    code: 'vpet_nursing_plan_type',
    remark: '住院护理计划类型选项',
    items: [
      { label: '用药', value: '1', orderNo: 1, remark: '护理计划类型：用药' },
      { label: '喂养', value: '2', orderNo: 2, remark: '护理计划类型：喂养' },
      { label: '监测', value: '3', orderNo: 3, remark: '护理计划类型：监测' },
      { label: '治疗', value: '4', orderNo: 4, remark: '护理计划类型：治疗' },
    ],
  },
  {
    name: '调拨状态',
    code: 'vpet_transfer_status',
    remark: '药品调拨状态选项',
    items: [
      { label: '待审批', value: '1', orderNo: 1, remark: '调拨状态：待审批' },
      { label: '已审批', value: '2', orderNo: 2, remark: '调拨状态：已审批' },
      { label: '已完成', value: '3', orderNo: 3, remark: '调拨状态：已完成' },
    ],
  },
  {
    name: '药品批次状态',
    code: 'vpet_pharmacy_batch_status',
    remark: '药品批次状态选项',
    items: [
      { label: '在库', value: '1', orderNo: 1, remark: '药品批次状态：在库' },
      { label: '近效期', value: '2', orderNo: 2, remark: '药品批次状态：近效期' },
      { label: '已过期', value: '3', orderNo: 3, remark: '药品批次状态：已过期' },
    ],
  },
]

export class SeedVpetMasterDicts1718000000001 implements MigrationInterface {
  name = 'SeedVpetMasterDicts1718000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const dict of DICT_SEEDS) {
      await queryRunner.query(
        `
          INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
          SELECT ?, ?, 1, ?, 1, 1, NOW(), NOW()
          FROM DUAL
          WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = ?)
        `,
        [dict.name, dict.code, dict.remark, dict.code],
      )

      for (const item of dict.items) {
        await queryRunner.query(
          `
            INSERT INTO sys_dict_item (type_id, label, value, orderNo, status, remark, create_by, update_by, created_at, updated_at)
            SELECT t.id, ?, ?, ?, 1, ?, 1, 1, NOW(), NOW()
            FROM sys_dict_type t
            WHERE t.code = ?
              AND NOT EXISTS (
                SELECT 1 FROM sys_dict_item i
                WHERE i.type_id = t.id AND i.value = ?
              )
          `,
          [item.label, item.value, item.orderNo, item.remark, dict.code, item.value],
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = DICT_SEEDS.map(dict => `'${dict.code}'`).join(', ')
    await queryRunner.query(`
      DELETE i
      FROM sys_dict_item i
      INNER JOIN sys_dict_type t ON t.id = i.type_id
      WHERE t.code IN (${codes})
    `)
    await queryRunner.query(`DELETE FROM sys_dict_type WHERE code IN (${codes})`)
  }
}
