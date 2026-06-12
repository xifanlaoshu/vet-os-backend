import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

export class AddTenantAreaToMemberAndStore1718000000039 implements MigrationInterface {
  name = 'AddTenantAreaToMemberAndStore1718000000039'

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (await queryRunner.hasTable(tableName) && !(await queryRunner.hasColumn(tableName, column.name)))
      await queryRunner.addColumn(tableName, column)
  }

  private async addIndexIfMissing(queryRunner: QueryRunner, tableName: string, index: TableIndex) {
    if (!(await queryRunner.hasTable(tableName)))
      return
    const table = await queryRunner.getTable(tableName)
    if (!table?.indices.some(item => item.name === index.name))
      await queryRunner.createIndex(tableName, index)
  }

  private tenantColumn() {
    return new TableColumn({
      name: 'tenant_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '租户 ID',
    })
  }

  private areaColumn() {
    return new TableColumn({
      name: 'area_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '院区 ID',
    })
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenantOnlyTables = ['vpet_member_card']
    const areaTables = [
      'vpet_member_card_log',
      'vpet_store',
      'vpet_store_drug_stock',
      'vpet_drug_transfer',
      'vpet_drug_transfer_item',
    ]

    for (const tableName of [...tenantOnlyTables, ...areaTables]) {
      await this.addColumnIfMissing(queryRunner, tableName, this.tenantColumn())
      await this.addIndexIfMissing(queryRunner, tableName, new TableIndex({
        name: `idx_${tableName}_tenant`.slice(0, 60),
        columnNames: ['tenant_id'],
      }))
    }

    for (const tableName of areaTables) {
      await this.addColumnIfMissing(queryRunner, tableName, this.areaColumn())
      await this.addIndexIfMissing(queryRunner, tableName, new TableIndex({
        name: `idx_${tableName}_tenant_area`.slice(0, 60),
        columnNames: ['tenant_id', 'area_id'],
      }))
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'vpet_member_card',
      'vpet_member_card_log',
      'vpet_store',
      'vpet_store_drug_stock',
      'vpet_drug_transfer',
      'vpet_drug_transfer_item',
    ]

    for (const tableName of tables) {
      if (!(await queryRunner.hasTable(tableName)))
        continue
      const table = await queryRunner.getTable(tableName)
      for (const index of table?.indices ?? []) {
        if (index.name.startsWith(`idx_${tableName}_tenant`.slice(0, 60)))
          await queryRunner.dropIndex(tableName, index)
      }
      if (await queryRunner.hasColumn(tableName, 'area_id'))
        await queryRunner.dropColumn(tableName, 'area_id')
      if (await queryRunner.hasColumn(tableName, 'tenant_id'))
        await queryRunner.dropColumn(tableName, 'tenant_id')
    }
  }
}
