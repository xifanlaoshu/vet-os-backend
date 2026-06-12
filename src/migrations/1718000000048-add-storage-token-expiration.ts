import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStorageTokenExpiration1718000000048 implements MigrationInterface {
  name = 'AddStorageTokenExpiration1718000000048'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tool_storage')
    if (!table)
      return

    if (!table.findColumnByName('token_expires_at')) {
      await queryRunner.query(
        `ALTER TABLE tool_storage
         ADD COLUMN token_expires_at datetime NULL COMMENT 'opaque token expiration time' AFTER access_token`,
      )
    }

    const refreshedTable = await queryRunner.getTable('tool_storage')
    if (!refreshedTable?.indices.some(index => index.name === 'idx_tool_storage_token_expiry')) {
      await queryRunner.query(
        'CREATE INDEX idx_tool_storage_token_expiry ON tool_storage (access_token, token_expires_at)',
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tool_storage')
    if (!table)
      return

    if (table.indices.some(index => index.name === 'idx_tool_storage_token_expiry'))
      await queryRunner.query('DROP INDEX idx_tool_storage_token_expiry ON tool_storage')
    if (table.findColumnByName('token_expires_at'))
      await queryRunner.query('ALTER TABLE tool_storage DROP COLUMN token_expires_at')
  }
}
