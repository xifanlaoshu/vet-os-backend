import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm'

export class AddVpetPrescriptionTemplate1718000000010 implements MigrationInterface {
  name = 'AddVpetPrescriptionTemplate1718000000010'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createTemplateTable(queryRunner)
    await this.createTemplateItemTable(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vpet_prescription_template_item', true)
    await queryRunner.dropTable('vpet_prescription_template', true)
  }

  private async createTemplateTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_prescription_template'))
      return
    await queryRunner.createTable(new Table({
      name: 'vpet_prescription_template',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'template_code', type: 'varchar', length: '50' },
        { name: 'template_name', type: 'varchar', length: '100' },
        { name: 'category', type: 'varchar', length: '50', isNullable: true },
        { name: 'species_scope', type: 'varchar', length: '50', isNullable: true },
        { name: 'status', type: 'tinyint', default: 1 },
        { name: 'description', type: 'varchar', length: '500', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_rx_template_code', columnNames: ['template_code'], isUnique: true }),
        new TableIndex({ name: 'idx_rx_template_status', columnNames: ['status'] }),
      ],
    }))
  }

  private async createTemplateItemTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_prescription_template_item'))
      return
    await queryRunner.createTable(new Table({
      name: 'vpet_prescription_template_item',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'template_id', type: 'int' },
        { name: 'drug_id', type: 'int', isNullable: true },
        { name: 'drug_name', type: 'varchar', length: '100' },
        { name: 'specification', type: 'varchar', length: '100', isNullable: true },
        { name: 'dosage', type: 'varchar', length: '50', isNullable: true },
        { name: 'dosage_unit', type: 'varchar', length: '20', isNullable: true },
        { name: 'frequency', type: 'varchar', length: '30', isNullable: true },
        { name: 'route', type: 'varchar', length: '30', isNullable: true },
        { name: 'duration', type: 'int', isNullable: true },
        { name: 'quantity', type: 'decimal', precision: 8, scale: 2, default: 1 },
        { name: 'unit_price', type: 'decimal', precision: 8, scale: 2, default: 0 },
        { name: 'remark', type: 'varchar', length: '200', isNullable: true },
        { name: 'sort_no', type: 'int', default: 0 },
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['template_id'],
          referencedTableName: 'vpet_prescription_template',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      ],
      indices: [
        new TableIndex({ name: 'idx_rx_template_item_template', columnNames: ['template_id'] }),
        new TableIndex({ name: 'idx_rx_template_item_drug', columnNames: ['drug_id'] }),
      ],
    }))
  }
}
