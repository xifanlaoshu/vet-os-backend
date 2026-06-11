import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm'

export class AddVpetVisitMedia1718000000033 implements MigrationInterface {
  name = 'AddVpetVisitMedia1718000000033'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createMediaBatchTable(queryRunner)
    await this.createMediaFileTable(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vpet_visit_media_file', true)
    await queryRunner.dropTable('vpet_visit_media_batch', true)
  }

  private async createMediaBatchTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_media_batch'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_media_batch',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'visit_id', type: 'int' },
        { name: 'batch_no', type: 'varchar', length: '30' },
        { name: 'captured_at', type: 'datetime' },
        { name: 'operator_id', type: 'int', isNullable: true },
        { name: 'relation_type', type: 'varchar', length: '20' },
        { name: 'care_followup_id', type: 'int', isNullable: true },
        { name: 'remark', type: 'text', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_visit_media_batch_visit', columnNames: ['visit_id'] }),
        new TableIndex({ name: 'idx_visit_media_batch_no', columnNames: ['batch_no'], isUnique: true }),
        new TableIndex({ name: 'idx_visit_media_batch_relation', columnNames: ['visit_id', 'relation_type', 'care_followup_id'] }),
        new TableIndex({ name: 'idx_visit_media_batch_captured_at', columnNames: ['captured_at'] }),
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['operator_id'],
          referencedTableName: 'vpet_doctor',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['care_followup_id'],
          referencedTableName: 'vpet_visit_care_followup',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ],
    }))
  }

  private async createMediaFileTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_media_file'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_media_file',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'batch_id', type: 'int' },
        { name: 'visit_id', type: 'int' },
        { name: 'file_type', type: 'varchar', length: '20' },
        { name: 'storage_type', type: 'varchar', length: '20' },
        { name: 'file_name', type: 'varchar', length: '255', isNullable: true },
        { name: 'original_name', type: 'varchar', length: '255', isNullable: true },
        { name: 'url', type: 'varchar', length: '1000' },
        { name: 'mime_type', type: 'varchar', length: '120', isNullable: true },
        { name: 'file_size', type: 'int', isNullable: true },
        { name: 'sort_no', type: 'int', default: 0 },
        { name: 'remark', type: 'text', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_visit_media_file_batch', columnNames: ['batch_id'] }),
        new TableIndex({ name: 'idx_visit_media_file_visit', columnNames: ['visit_id'] }),
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['batch_id'],
          referencedTableName: 'vpet_visit_media_batch',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      ],
    }))
  }
}
