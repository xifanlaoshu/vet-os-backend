import { MigrationInterface, QueryRunner } from 'typeorm'

interface DictSeed {
  name: string
  code: string
  remark: string
  items?: Array<{
    label: string
    value: string
    orderNo: number
    remark: string
  }>
}

const DICT_SEEDS: DictSeed[] = [
  {
    name: '宠物物种',
    code: 'pet_species',
    remark: '犬、猫、兔、仓鼠等宠物物种分类',
    items: [
      { label: '犬', value: 'dog', orderNo: 1, remark: '宠物物种：犬' },
      { label: '猫', value: 'cat', orderNo: 2, remark: '宠物物种：猫' },
      { label: '兔', value: 'rabbit', orderNo: 3, remark: '宠物物种：兔' },
      { label: '仓鼠', value: 'hamster', orderNo: 4, remark: '宠物物种：仓鼠' },
      { label: '龙猫', value: 'chinchilla', orderNo: 5, remark: '宠物物种：龙猫' },
      { label: '豚鼠', value: 'guinea_pig', orderNo: 6, remark: '宠物物种：豚鼠' },
      { label: '鸟', value: 'bird', orderNo: 7, remark: '宠物物种：鸟' },
      { label: '龟', value: 'turtle', orderNo: 8, remark: '宠物物种：龟' },
      { label: '蛇', value: 'snake', orderNo: 9, remark: '宠物物种：蛇' },
      { label: '蜥蜴', value: 'lizard', orderNo: 10, remark: '宠物物种：蜥蜴' },
      { label: '其他', value: 'other', orderNo: 99, remark: '宠物物种：其他' },
    ],
  },
  {
    name: '犬品种',
    code: 'pet_breed_dog',
    remark: '常见犬品种列表',
    items: [
      { label: '金毛寻回犬', value: '金毛寻回犬', orderNo: 1, remark: '犬品种：金毛寻回犬' },
      { label: '拉布拉多', value: '拉布拉多', orderNo: 2, remark: '犬品种：拉布拉多' },
      { label: '泰迪/贵宾', value: '泰迪/贵宾', orderNo: 3, remark: '犬品种：泰迪/贵宾' },
      { label: '柯基', value: '柯基', orderNo: 4, remark: '犬品种：柯基' },
      { label: '哈士奇', value: '哈士奇', orderNo: 5, remark: '犬品种：哈士奇' },
      { label: '边境牧羊犬', value: '边境牧羊犬', orderNo: 6, remark: '犬品种：边境牧羊犬' },
      { label: '萨摩耶', value: '萨摩耶', orderNo: 7, remark: '犬品种：萨摩耶' },
      { label: '柴犬', value: '柴犬', orderNo: 8, remark: '犬品种：柴犬' },
      { label: '博美', value: '博美', orderNo: 9, remark: '犬品种：博美' },
      { label: '比熊', value: '比熊', orderNo: 10, remark: '犬品种：比熊' },
      { label: '法国斗牛犬', value: '法国斗牛犬', orderNo: 11, remark: '犬品种：法国斗牛犬' },
      { label: '中华田园犬', value: '中华田园犬', orderNo: 12, remark: '犬品种：中华田园犬' },
    ],
  },
  {
    name: '猫品种',
    code: 'pet_breed_cat',
    remark: '常见猫品种列表',
    items: [
      { label: '英国短毛猫', value: '英国短毛猫', orderNo: 1, remark: '猫品种：英国短毛猫' },
      { label: '美国短毛猫', value: '美国短毛猫', orderNo: 2, remark: '猫品种：美国短毛猫' },
      { label: '布偶猫', value: '布偶猫', orderNo: 3, remark: '猫品种：布偶猫' },
      { label: '暹罗猫', value: '暹罗猫', orderNo: 4, remark: '猫品种：暹罗猫' },
      { label: '中华田园猫', value: '中华田园猫', orderNo: 5, remark: '猫品种：中华田园猫' },
      { label: '缅因猫', value: '缅因猫', orderNo: 6, remark: '猫品种：缅因猫' },
      { label: '波斯猫', value: '波斯猫', orderNo: 7, remark: '猫品种：波斯猫' },
      { label: '苏格兰折耳猫', value: '苏格兰折耳猫', orderNo: 8, remark: '猫品种：苏格兰折耳猫' },
    ],
  },
  {
    name: '兽医诊断编码(ICD-CA)',
    code: 'vet_diagnosis',
    remark: 'ICD-CA 兽医临床诊断编码',
  },
]

export class SeedDictSpeciesBreeds1717000000000 implements MigrationInterface {
  name = 'SeedDictSpeciesBreeds1717000000000'

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

      for (const item of dict.items ?? []) {
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
