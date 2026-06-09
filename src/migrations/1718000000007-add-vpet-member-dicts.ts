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
    name: '会员卡状态',
    code: 'vpet_member_card_status',
    remark: '会员卡状态选项',
    items: [
      { label: '正常', value: '1', orderNo: 1, remark: '会员卡状态：正常' },
      { label: '停用', value: '0', orderNo: 2, remark: '会员卡状态：停用' },
    ],
  },
  {
    name: '会员等级',
    code: 'vpet_member_card_level',
    remark: '会员等级选项',
    items: [
      { label: '普通会员', value: '1', orderNo: 1, remark: '会员等级：普通会员' },
      { label: '银卡会员', value: '2', orderNo: 2, remark: '会员等级：银卡会员' },
      { label: '金卡会员', value: '3', orderNo: 3, remark: '会员等级：金卡会员' },
      { label: '钻石会员', value: '4', orderNo: 4, remark: '会员等级：钻石会员' },
    ],
  },
  {
    name: '会员流水类型',
    code: 'vpet_member_card_log_type',
    remark: '会员卡流水类型选项',
    items: [
      { label: '充值', value: '1', orderNo: 1, remark: '会员流水类型：充值' },
      { label: '退款', value: '2', orderNo: 2, remark: '会员流水类型：退款' },
      { label: '扣款', value: '3', orderNo: 3, remark: '会员流水类型：扣款' },
      { label: '调账', value: '4', orderNo: 4, remark: '会员流水类型：调账' },
    ],
  },
  {
    name: '会员流水方向',
    code: 'vpet_member_card_log_direction',
    remark: '会员卡流水收支方向选项',
    items: [
      { label: '收入', value: '1', orderNo: 1, remark: '会员流水方向：收入' },
      { label: '支出', value: '2', orderNo: 2, remark: '会员流水方向：支出' },
    ],
  },
]

export class AddVpetMemberDicts1718000000007 implements MigrationInterface {
  name = 'AddVpetMemberDicts1718000000007'

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
