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
         ADD COLUMN tenant_id int NOT NULL DEFAULT 1 COMMENT 'tenant id' AFTER id`,
      )
    }

    if (!table.findColumnByName('area_id')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN area_id int NOT NULL DEFAULT 1 COMMENT 'area id' AFTER tenant_id`,
      )
    }

    if (!table.findColumnByName('disk_path')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN disk_path varchar(500) NULL COMMENT 'disk storage path' AFTER path`,
      )
      await queryRunner.query('UPDATE tool_storage SET disk_path = path WHERE disk_path IS NULL')
    }

    if (!table.findColumnByName('access_token')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN access_token varchar(80) NULL COMMENT 'opaque access token' AFTER disk_path`,
      )
    }

    if (!table.findColumnByName('biz_type')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN biz_type varchar(80) NULL COMMENT 'business type' AFTER user_id`,
      )
    }

    if (!table.findColumnByName('biz_id')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN biz_id int NULL COMMENT 'business id' AFTER biz_type`,
      )
    }

    if (!table.findColumnByName('scan_status')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN scan_status tinyint NOT NULL DEFAULT 1 COMMENT 'scan status: 1 pending, 2 passed, 3 rejected' AFTER biz_id`,
      )
    }

    const refreshedTable = await queryRunner.getTable('tool_storage')
    if (!refreshedTable?.indices.some(index => index.name === 'idx_tool_storage_tenant_area')) {
      await queryRunner.query(
        'CREATE INDEX idx_tool_storage_tenant_area ON tool_storage (tenant_id, area_id)',
      )
    }
    if (!refreshedTable?.indices.some(index => index.name === 'idx_tool_storage_access_token')) {
      await queryRunner.query(
        'CREATE UNIQUE INDEX idx_tool_storage_access_token ON tool_storage (access_token)',
      )
    }
    if (!refreshedTable?.indices.some(index => index.name === 'idx_tool_storage_biz')) {
      await queryRunner.query(
        'CREATE INDEX idx_tool_storage_biz ON tool_storage (tenant_id, area_id, biz_type, biz_id)',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tool_storage')
    if (!table)
      return

    if (table.indices.some(index => index.name === 'idx_tool_storage_biz'))
      await queryRunner.query('DROP INDEX idx_tool_storage_biz ON tool_storage')
    if (table.indices.some(index => index.name === 'idx_tool_storage_access_token'))
      await queryRunner.query('DROP INDEX idx_tool_storage_access_token ON tool_storage')
    if (table.indices.some(index => index.name === 'idx_tool_storage_tenant_area'))
      await queryRunner.query('DROP INDEX idx_tool_storage_tenant_area ON tool_storage')
    if (table.findColumnByName('scan_status'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN scan_status')
    if (table.findColumnByName('biz_id'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN biz_id')
    if (table.findColumnByName('biz_type'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN biz_type')
    if (table.findColumnByName('access_token'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN access_token')
    if (table.findColumnByName('disk_path'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN disk_path')
    if (table.findColumnByName('area_id'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN area_id')
    if (table.findColumnByName('tenant_id'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN tenant_id')
  }
}
