import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm'

export class AddVisitMediaThumbnail1718000000050 implements MigrationInterface {
  name = 'AddVisitMediaThumbnail1718000000050'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_visit_media_file')
    if (!table?.findColumnByName('thumbnail_storage_id')) {
      await queryRunner.addColumn('vpet_visit_media_file', new TableColumn({
        name: 'thumbnail_storage_id',
        type: 'int',
        isNullable: true,
      }))
    }
    if (!table?.findColumnByName('thumbnail_url')) {
      await queryRunner.addColumn('vpet_visit_media_file', new TableColumn({
        name: 'thumbnail_url',
        type: 'varchar',
        length: '1000',
        isNullable: true,
      }))
    }

    const updatedTable = await queryRunner.getTable('vpet_visit_media_file')
    if (!updatedTable?.indices.some(index => index.name === 'idx_visit_media_file_thumb_storage')) {
      await queryRunner.createIndex('vpet_visit_media_file', new TableIndex({
        name: 'idx_visit_media_file_thumb_storage',
        columnNames: ['thumbnail_storage_id'],
      }))
    }
    if (!updatedTable?.foreignKeys.some(key => key.name === 'fk_visit_media_file_thumb_storage')) {
      await queryRunner.createForeignKey('vpet_visit_media_file', new TableForeignKey({
        name: 'fk_visit_media_file_thumb_storage',
        columnNames: ['thumbnail_storage_id'],
        referencedTableName: 'tool_storage',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }))
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_visit_media_file')
    const foreignKey = table?.foreignKeys.find(key => key.name === 'fk_visit_media_file_thumb_storage')
    if (foreignKey)
      await queryRunner.dropForeignKey('vpet_visit_media_file', foreignKey)

    const index = table?.indices.find(item => item.name === 'idx_visit_media_file_thumb_storage')
    if (index)
      await queryRunner.dropIndex('vpet_visit_media_file', index)

    if (table?.findColumnByName('thumbnail_url'))
      await queryRunner.dropColumn('vpet_visit_media_file', 'thumbnail_url')
    if (table?.findColumnByName('thumbnail_storage_id'))
      await queryRunner.dropColumn('vpet_visit_media_file', 'thumbnail_storage_id')
  }
}
