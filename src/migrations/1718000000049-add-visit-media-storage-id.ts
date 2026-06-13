import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVisitMediaStorageId1718000000049 implements MigrationInterface {
  name = 'AddVisitMediaStorageId1718000000049'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_visit_media_file')
    if (!table)
      return

    if (!table.findColumnByName('storage_id')) {
      await queryRunner.query(
        `ALTER TABLE vpet_visit_media_file
         ADD COLUMN storage_id int NULL COMMENT 'linked protected storage id' AFTER storage_type`,
      )
    }

    await queryRunner.query(
      `UPDATE vpet_visit_media_file mf
       INNER JOIN tool_storage s
         ON mf.storage_type = 'local'
        AND (
          CONVERT(mf.url USING utf8mb4) COLLATE utf8mb4_unicode_ci
            = CONVERT(s.path USING utf8mb4) COLLATE utf8mb4_unicode_ci
          OR CONVERT(mf.original_name USING utf8mb4) COLLATE utf8mb4_unicode_ci
            = CONVERT(s.fileName USING utf8mb4) COLLATE utf8mb4_unicode_ci
          OR CONVERT(mf.file_name USING utf8mb4) COLLATE utf8mb4_unicode_ci
            = CONVERT(s.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
        )
        AND mf.tenant_id = s.tenant_id
        AND mf.area_id = s.area_id
       SET mf.storage_id = s.id
       WHERE mf.storage_id IS NULL`,
    )

    const refreshedTable = await queryRunner.getTable('vpet_visit_media_file')
    if (!refreshedTable?.indices.some(index => index.name === 'idx_visit_media_file_storage')) {
      await queryRunner.query(
        'CREATE INDEX idx_visit_media_file_storage ON vpet_visit_media_file (storage_id)',
      )
    }

    const foreignKeys = (await queryRunner.getTable('vpet_visit_media_file'))?.foreignKeys ?? []
    if (!foreignKeys.some(fk => fk.name === 'fk_visit_media_file_storage')) {
      await queryRunner.query(
        `ALTER TABLE vpet_visit_media_file
         ADD CONSTRAINT fk_visit_media_file_storage
         FOREIGN KEY (storage_id) REFERENCES tool_storage(id)
         ON DELETE SET NULL`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_visit_media_file')
    if (!table)
      return

    if (table.foreignKeys.some(fk => fk.name === 'fk_visit_media_file_storage'))
      await queryRunner.query('ALTER TABLE vpet_visit_media_file DROP FOREIGN KEY fk_visit_media_file_storage')
    if (table.indices.some(index => index.name === 'idx_visit_media_file_storage'))
      await queryRunner.query('DROP INDEX idx_visit_media_file_storage ON vpet_visit_media_file')
    if (table.findColumnByName('storage_id'))
      await queryRunner.query('ALTER TABLE vpet_visit_media_file DROP COLUMN storage_id')
  }
}
