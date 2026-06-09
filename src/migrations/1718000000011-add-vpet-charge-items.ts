import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm'

const CHARGE_ITEM_CATEGORIES = [
  { label: '手术', value: 'surgery', orderNo: 1 },
  { label: '护理', value: 'nursing', orderNo: 2 },
  { label: '治疗', value: 'treatment', orderNo: 3 },
  { label: '体检', value: 'exam', orderNo: 4 },
  { label: '美容', value: 'grooming', orderNo: 5 },
  { label: '其他服务', value: 'other', orderNo: 6 },
]

const CHARGE_ITEMS = [
  ['SVC-SUR-001', '猫绝育手术', 'surgery', '台', 680],
  ['SVC-SUR-002', '犬绝育手术', 'surgery', '台', 980],
  ['SVC-SUR-003', '皮肤肿物切除术', 'surgery', '台', 1200],
  ['SVC-NUR-001', '皮下注射护理', 'nursing', '次', 20],
  ['SVC-NUR-002', '静脉输液护理', 'nursing', '次', 80],
  ['SVC-NUR-003', '伤口换药护理', 'nursing', '次', 60],
  ['SVC-TRT-001', '雾化治疗', 'treatment', '次', 50],
  ['SVC-TRT-002', '耳道清洁治疗', 'treatment', '次', 60],
  ['SVC-EXM-001', '基础体检套餐', 'exam', '次', 128],
  ['SVC-EXM-002', '术前检查服务', 'exam', '次', 260],
  ['SVC-GRM-001', '猫咪基础洗护', 'grooming', '次', 158],
  ['SVC-GRM-002', '犬只基础洗护', 'grooming', '次', 128],
]

export class AddVpetChargeItems1718000000011 implements MigrationInterface {
  name = 'AddVpetChargeItems1718000000011'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createChargeItemTable(queryRunner)
    await this.addPrescriptionItemColumns(queryRunner, 'vpet_rx_detail')
    await this.addPrescriptionItemColumns(queryRunner, 'vpet_prescription_template_item')
    await this.seedChargeItemCategoryDict(queryRunner)
    await this.seedChargeItems(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vpet_charge_item', true)
    await this.dropColumnsIfExists(queryRunner, 'vpet_rx_detail', ['charge_item_id', 'item_name', 'item_id', 'item_kind'])
    await this.dropColumnsIfExists(queryRunner, 'vpet_prescription_template_item', ['charge_item_id', 'item_name', 'item_id', 'item_kind'])
    await queryRunner.query(`
      DELETE i
      FROM sys_dict_item i
      INNER JOIN sys_dict_type t ON t.id = i.type_id
      WHERE t.code = 'vpet_charge_item_category'
    `)
    await queryRunner.query(`DELETE FROM sys_dict_type WHERE code = 'vpet_charge_item_category'`)
  }

  private async createChargeItemTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_charge_item'))
      return
    await queryRunner.createTable(new Table({
      name: 'vpet_charge_item',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'item_code', type: 'varchar', length: '30', isUnique: true },
        { name: 'item_name', type: 'varchar', length: '100' },
        { name: 'category', type: 'varchar', length: '50', isNullable: true },
        { name: 'specification', type: 'varchar', length: '100', isNullable: true },
        { name: 'unit', type: 'varchar', length: '20', default: '\'项\'' },
        { name: 'retail_price', type: 'decimal', precision: 8, scale: 2, default: 0 },
        { name: 'status', type: 'tinyint', default: 1 },
        { name: 'description', type: 'text', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_charge_item_code', columnNames: ['item_code'], isUnique: true }),
        new TableIndex({ name: 'idx_charge_item_category', columnNames: ['category'] }),
      ],
    }))
  }

  private async addPrescriptionItemColumns(queryRunner: QueryRunner, tableName: string) {
    await this.addColumnIfMissing(queryRunner, tableName, new TableColumn({
      name: 'item_kind',
      type: 'tinyint',
      default: 1,
    }))
    await this.addColumnIfMissing(queryRunner, tableName, new TableColumn({
      name: 'item_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, tableName, new TableColumn({
      name: 'item_name',
      type: 'varchar',
      length: '100',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, tableName, new TableColumn({
      name: 'charge_item_id',
      type: 'int',
      isNullable: true,
    }))
    await queryRunner.query(`
      UPDATE ${tableName}
      SET item_kind = 1,
          item_id = drug_id,
          item_name = drug_name
      WHERE item_id IS NULL
    `)
  }

  private async seedChargeItemCategoryDict(queryRunner: QueryRunner) {
    await queryRunner.query(
      `
        INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
        SELECT '服务项目分类', 'vpet_charge_item_category', 1, '宠物医院服务类收费项目分类', 1, 1, NOW(), NOW()
        FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'vpet_charge_item_category')
      `,
    )

    for (const item of CHARGE_ITEM_CATEGORIES) {
      await queryRunner.query(
        `
          INSERT INTO sys_dict_item (type_id, label, value, orderNo, status, remark, create_by, update_by, created_at, updated_at)
          SELECT t.id, ?, ?, ?, 1, ?, 1, 1, NOW(), NOW()
          FROM sys_dict_type t
          WHERE t.code = 'vpet_charge_item_category'
            AND NOT EXISTS (
              SELECT 1 FROM sys_dict_item i
              WHERE i.type_id = t.id AND i.value = ?
            )
        `,
        [item.label, item.value, item.orderNo, `服务项目分类：${item.label}`, item.value],
      )
    }
  }

  private async seedChargeItems(queryRunner: QueryRunner) {
    for (const [code, name, category, unit, price] of CHARGE_ITEMS) {
      await queryRunner.query(
        `
          INSERT INTO vpet_charge_item
            (item_code, item_name, category, unit, retail_price, status, description, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, 1, ?, NOW(), NOW()
          FROM DUAL
          WHERE NOT EXISTS (SELECT 1 FROM vpet_charge_item WHERE item_code = ?)
        `,
        [code, name, category, unit, price, `${name}服务收费项目`, code],
      )
    }
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(tableName, column.name))) {
      await queryRunner.addColumn(tableName, column)
    }
  }

  private async dropColumnsIfExists(queryRunner: QueryRunner, tableName: string, columns: string[]) {
    for (const column of columns) {
      if (await queryRunner.hasColumn(tableName, column)) {
        await queryRunner.dropColumn(tableName, column)
      }
    }
  }
}
