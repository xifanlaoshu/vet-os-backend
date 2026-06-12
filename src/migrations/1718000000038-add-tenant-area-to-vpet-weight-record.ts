import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

export class AddTenantAreaToVpetWeightRecord1718000000038 implements MigrationInterface {
  name = 'AddTenantAreaToVpetWeightRecord1718000000038'

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

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, 'vpet_weight_record', new TableColumn({
      name: 'tenant_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '租户 ID',
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_weight_record', new TableColumn({
      name: 'area_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '院区 ID',
    }))
    await this.addIndexIfMissing(queryRunner, 'vpet_weight_record', new TableIndex({
      name: 'idx_vpet_weight_record_tenant_area',
      columnNames: ['tenant_id', 'area_id'],
    }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('vpet_weight_record')))
      return
    const table = await queryRunner.getTable('vpet_weight_record')
    const index = table?.indices.find(item => item.name === 'idx_vpet_weight_record_tenant_area')
    if (index)
      await queryRunner.dropIndex('vpet_weight_record', index)
    if (await queryRunner.hasColumn('vpet_weight_record', 'area_id'))
      await queryRunner.dropColumn('vpet_weight_record', 'area_id')
    if (await queryRunner.hasColumn('vpet_weight_record', 'tenant_id'))
      await queryRunner.dropColumn('vpet_weight_record', 'tenant_id')
  }
}
