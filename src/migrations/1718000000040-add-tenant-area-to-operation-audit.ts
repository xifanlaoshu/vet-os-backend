import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

export class AddTenantAreaToOperationAudit1718000000040 implements MigrationInterface {
  name = 'AddTenantAreaToOperationAudit1718000000040'

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
    await this.addColumnIfMissing(queryRunner, 'vpet_operation_audit_log', new TableColumn({
      name: 'tenant_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '绉熸埛 ID',
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_operation_audit_log', new TableColumn({
      name: 'area_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '闄㈠尯 ID',
    }))
    await this.addIndexIfMissing(queryRunner, 'vpet_operation_audit_log', new TableIndex({
      name: 'idx_vpet_operation_audit_tenant_area',
      columnNames: ['tenant_id', 'area_id'],
    }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('vpet_operation_audit_log')))
      return
    const table = await queryRunner.getTable('vpet_operation_audit_log')
    const index = table?.indices.find(item => item.name === 'idx_vpet_operation_audit_tenant_area')
    if (index)
      await queryRunner.dropIndex('vpet_operation_audit_log', index)
    if (await queryRunner.hasColumn('vpet_operation_audit_log', 'area_id'))
      await queryRunner.dropColumn('vpet_operation_audit_log', 'area_id')
    if (await queryRunner.hasColumn('vpet_operation_audit_log', 'tenant_id'))
      await queryRunner.dropColumn('vpet_operation_audit_log', 'tenant_id')
  }
}
