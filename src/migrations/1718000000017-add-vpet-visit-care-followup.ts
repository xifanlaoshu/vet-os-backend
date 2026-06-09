import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm'

export class AddVpetVisitCareFollowup1718000000017 implements MigrationInterface {
  name = 'AddVpetVisitCareFollowup1718000000017'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createFollowupTable(queryRunner)
    await this.createFollowupLabTable(queryRunner)
    await this.createFollowupPrescriptionTable(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vpet_visit_care_followup_prescription', true)
    await queryRunner.dropTable('vpet_visit_care_followup_lab', true)
    await queryRunner.dropTable('vpet_visit_care_followup', true)
  }

  private async createFollowupTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_care_followup'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_care_followup',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'visit_id', type: 'int' },
        { name: 'batch_no', type: 'varchar', length: '30' },
        { name: 'occurred_at', type: 'datetime' },
        { name: 'care_stage', type: 'tinyint', isNullable: true },
        { name: 'symptom_summary', type: 'text', isNullable: true },
        { name: 'status_summary', type: 'text', isNullable: true },
        { name: 'vital_signs', type: 'json', isNullable: true },
        { name: 'objective_note', type: 'text', isNullable: true },
        { name: 'assessment_text', type: 'text', isNullable: true },
        { name: 'plan_adjustment', type: 'text', isNullable: true },
        { name: 'medication_adjustment', type: 'text', isNullable: true },
        { name: 'remark', type: 'text', isNullable: true },
        { name: 'recorded_by', type: 'int', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_visit_care_followup_visit', columnNames: ['visit_id'] }),
        new TableIndex({ name: 'idx_visit_care_followup_batch_no', columnNames: ['visit_id', 'batch_no'], isUnique: true }),
        new TableIndex({ name: 'idx_visit_care_followup_occurred_at', columnNames: ['occurred_at'] }),
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      ],
    }))
  }

  private async createFollowupLabTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_care_followup_lab'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_care_followup_lab',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'followup_id', type: 'int' },
        { name: 'lab_order_id', type: 'int' },
      ],
      indices: [
        new TableIndex({ name: 'idx_visit_care_followup_lab_followup', columnNames: ['followup_id'] }),
        new TableIndex({ name: 'idx_visit_care_followup_lab_order', columnNames: ['lab_order_id'] }),
        new TableIndex({ name: 'idx_visit_care_followup_lab_unique', columnNames: ['followup_id', 'lab_order_id'], isUnique: true }),
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['followup_id'],
          referencedTableName: 'vpet_visit_care_followup',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['lab_order_id'],
          referencedTableName: 'vpet_lab_order',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      ],
    }))
  }

  private async createFollowupPrescriptionTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_care_followup_prescription'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_care_followup_prescription',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'followup_id', type: 'int' },
        { name: 'prescription_id', type: 'int' },
      ],
      indices: [
        new TableIndex({ name: 'idx_visit_care_followup_rx_followup', columnNames: ['followup_id'] }),
        new TableIndex({ name: 'idx_visit_care_followup_rx_prescription', columnNames: ['prescription_id'] }),
        new TableIndex({ name: 'idx_visit_care_followup_rx_unique', columnNames: ['followup_id', 'prescription_id'], isUnique: true }),
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['followup_id'],
          referencedTableName: 'vpet_visit_care_followup',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['prescription_id'],
          referencedTableName: 'vpet_prescription',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      ],
    }))
  }
}
