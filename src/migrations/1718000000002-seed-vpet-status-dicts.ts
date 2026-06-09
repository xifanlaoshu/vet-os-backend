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
    name: '处方状态',
    code: 'vpet_prescription_status',
    remark: '处方状态选项',
    items: [
      { label: '草稿', value: '1', orderNo: 1, remark: '处方状态：草稿' },
      { label: '待审核', value: '2', orderNo: 2, remark: '处方状态：待审核' },
      { label: '已审核', value: '3', orderNo: 3, remark: '处方状态：已审核' },
      { label: '已发药', value: '4', orderNo: 4, remark: '处方状态：已发药' },
      { label: '已作废', value: '5', orderNo: 5, remark: '处方状态：已作废' },
    ],
  },
  {
    name: '宠物状态',
    code: 'vpet_pet_status',
    remark: '宠物状态选项',
    items: [
      { label: '正常', value: '1', orderNo: 1, remark: '宠物状态：正常' },
      { label: '住院中', value: '2', orderNo: 2, remark: '宠物状态：住院中' },
      { label: '安乐', value: '3', orderNo: 3, remark: '宠物状态：安乐' },
      { label: '已死亡', value: '4', orderNo: 4, remark: '宠物状态：已死亡' },
    ],
  },
  {
    name: '药品状态',
    code: 'vpet_pharmacy_status',
    remark: '药房药品状态选项',
    items: [
      { label: '停用', value: '0', orderNo: 1, remark: '药品状态：停用' },
      { label: '启用', value: '1', orderNo: 2, remark: '药品状态：启用' },
    ],
  },
  {
    name: '宠物生命阶段',
    code: 'pet_life_stage',
    remark: '宠物生命阶段选项',
    items: [
      { label: '幼年', value: '1', orderNo: 1, remark: '宠物生命阶段：幼年' },
      { label: '成年', value: '2', orderNo: 2, remark: '宠物生命阶段：成年' },
      { label: '老年', value: '3', orderNo: 3, remark: '宠物生命阶段：老年' },
    ],
  },
  {
    name: '队列事件类型',
    code: 'vpet_queue_event_type',
    remark: '就诊队列事件类型选项',
    items: [
      { label: '签到入队', value: '1', orderNo: 1, remark: '队列事件类型：签到入队' },
      { label: '医生叫号', value: '2', orderNo: 2, remark: '队列事件类型：医生叫号' },
      { label: '开始接诊', value: '3', orderNo: 3, remark: '队列事件类型：开始接诊' },
      { label: '结束就诊', value: '4', orderNo: 4, remark: '队列事件类型：结束就诊' },
      { label: '过号', value: '5', orderNo: 5, remark: '队列事件类型：过号' },
    ],
  },
  {
    name: '护理执行状态',
    code: 'vpet_nursing_execution_status',
    remark: '住院护理执行状态选项',
    items: [
      { label: '待执行', value: '1', orderNo: 1, remark: '护理执行状态：待执行' },
      { label: '已执行', value: '2', orderNo: 2, remark: '护理执行状态：已执行' },
    ],
  },
]

export class SeedVpetStatusDicts1718000000002 implements MigrationInterface {
  name = 'SeedVpetStatusDicts1718000000002'

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
