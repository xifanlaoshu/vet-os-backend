import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTenantAreaToToolStorage1718000000045 implements MigrationInterface {
  name = 'AddTenantAreaToToolStorage1718000000045'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tool_storage')
    if (!table)
      return

    if (!table.findColumnByName('tenant_id')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN tenant_id int NOT NULL DEFAULT 1 COMMENT '租户 ID' AFTER id`,
      )
    }

    if (!table.findColumnByName('area_id')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN area_id int NOT NULL DEFAULT 1 COMMENT '院区 ID' AFTER tenant_id`,
      )
    }

    const refreshedTable = await queryRunner.getTable('tool_storage')
    if (!refreshedTable?.indices.some(index => index.name === 'idx_tool_storage_tenant_area')) {
      await queryRunner.query(
        'CREATE INDEX idx_tool_storage_tenant_area ON tool_storage (tenant_id, area_id)',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tool_storage')
    if (!table)
      return

    if (table.indices.some(index => index.name === 'idx_tool_storage_tenant_area'))
      await queryRunner.query('DROP INDEX idx_tool_storage_tenant_area ON tool_storage')
    if (table.findColumnByName('area_id'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN area_id')
    if (table.findColumnByName('tenant_id'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN tenant_id')
  }
}
