import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm'

export class AddLongCareAndChronicManagement1718000000006 implements MigrationInterface {
  name = 'AddLongCareAndChronicManagement1718000000006'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addVisitColumns(queryRunner)
    await this.addPrescriptionColumns(queryRunner)
    await this.addBillingColumns(queryRunner)
    await this.addLabColumns(queryRunner)
    await this.createVisitProgressBatchTable(queryRunner)
    await this.createVisitPlanBatchTable(queryRunner)
    await this.createLabTemplateTable(queryRunner)
    await this.createChronicCaseTable(queryRunner)
    await this.createChronicFollowupTable(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vpet_chronic_followup', true)
    await queryRunner.dropTable('vpet_chronic_case', true)
    await queryRunner.dropTable('vpet_lab_template', true)
    await queryRunner.dropTable('vpet_visit_plan_batch', true)
    await queryRunner.dropTable('vpet_visit_progress_batch', true)

    await this.dropColumnsIfExists(queryRunner, 'vpet_lab_order', [
      'template_id',
      'template_name',
      'source_type',
      'source_id',
      'charge_amount',
      'template_snapshot',
      'structured_report',
      'raw_report_files',
    ])

    await this.dropColumnsIfExists(queryRunner, 'vpet_billing', [
      'pet_id',
      'customer_snapshot',
      'pet_snapshot',
    ])

    await this.dropColumnsIfExists(queryRunner, 'vpet_prescription', [
      'customer_id',
      'pet_id',
      'hospitalization_id',
      'batch_no',
      'batch_label',
      'source_type',
      'source_id',
      'customer_snapshot',
      'pet_snapshot',
      'doctor_snapshot',
    ])

    await this.dropColumnsIfExists(queryRunner, 'vpet_visit', [
      'care_mode',
      'care_stage',
      'ongoing_flags',
    ])
  }

  private async addVisitColumns(queryRunner: QueryRunner) {
    await this.addColumnIfMissing(queryRunner, 'vpet_visit', new TableColumn({
      name: 'care_mode',
      type: 'tinyint',
      default: '1',
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_visit', new TableColumn({
      name: 'care_stage',
      type: 'tinyint',
      default: '1',
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_visit', new TableColumn({
      name: 'ongoing_flags',
      type: 'json',
      isNullable: true,
    }))
  }

  private async addPrescriptionColumns(queryRunner: QueryRunner) {
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'customer_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'pet_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'hospitalization_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'batch_no',
      type: 'varchar',
      length: '30',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'batch_label',
      type: 'varchar',
      length: '100',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'source_type',
      type: 'varchar',
      length: '30',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'source_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'customer_snapshot',
      type: 'json',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'pet_snapshot',
      type: 'json',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription', new TableColumn({
      name: 'doctor_snapshot',
      type: 'json',
      isNullable: true,
    }))
  }

  private async addBillingColumns(queryRunner: QueryRunner) {
    await this.addColumnIfMissing(queryRunner, 'vpet_billing', new TableColumn({
      name: 'pet_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_billing', new TableColumn({
      name: 'customer_snapshot',
      type: 'json',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_billing', new TableColumn({
      name: 'pet_snapshot',
      type: 'json',
      isNullable: true,
    }))
  }

  private async addLabColumns(queryRunner: QueryRunner) {
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'template_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'template_name',
      type: 'varchar',
      length: '100',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'source_type',
      type: 'varchar',
      length: '30',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'source_id',
      type: 'int',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'charge_amount',
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: '0.00',
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'template_snapshot',
      type: 'json',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'structured_report',
      type: 'json',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_lab_order', new TableColumn({
      name: 'raw_report_files',
      type: 'json',
      isNullable: true,
    }))
  }

  private async createVisitProgressBatchTable(queryRunner: QueryRunner) {
    const exists = await queryRunner.hasTable('vpet_visit_progress_batch')
    if (exists)
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_progress_batch',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'visit_id', type: 'int' },
        { name: 'batch_no', type: 'varchar', length: '30' },
        { name: 'care_stage', type: 'tinyint', isNullable: true },
        { name: 'symptom_summary', type: 'text', isNullable: true },
        { name: 'status_summary', type: 'text', isNullable: true },
        { name: 'physical_exam', type: 'json', isNullable: true },
        { name: 'assessment_text', type: 'text', isNullable: true },
        { name: 'diagnosis_snapshot', type: 'json', isNullable: true },
        { name: 'remark', type: 'text', isNullable: true },
        { name: 'recorded_by', type: 'int', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_visit_progress_visit', columnNames: ['visit_id'] }),
        new TableIndex({ name: 'idx_visit_progress_batch_no', columnNames: ['visit_id', 'batch_no'], isUnique: true }),
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

  private async createVisitPlanBatchTable(queryRunner: QueryRunner) {
    const exists = await queryRunner.hasTable('vpet_visit_plan_batch')
    if (exists)
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_plan_batch',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'visit_id', type: 'int' },
        { name: 'batch_no', type: 'varchar', length: '30' },
        { name: 'care_stage', type: 'tinyint', isNullable: true },
        { name: 'plan_summary', type: 'text', isNullable: true },
        { name: 'doctor_advice', type: 'text', isNullable: true },
        { name: 'structured_actions', type: 'json', isNullable: true },
        { name: 'follow_up_actions', type: 'json', isNullable: true },
        { name: 'remark', type: 'text', isNullable: true },
        { name: 'recorded_by', type: 'int', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_visit_plan_visit', columnNames: ['visit_id'] }),
        new TableIndex({ name: 'idx_visit_plan_batch_no', columnNames: ['visit_id', 'batch_no'] }),
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

  private async createLabTemplateTable(queryRunner: QueryRunner) {
    const exists = await queryRunner.hasTable('vpet_lab_template')
    if (exists)
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_lab_template',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'code', type: 'varchar', length: '50', isUnique: true },
        { name: 'name', type: 'varchar', length: '100' },
        { name: 'category', type: 'tinyint', default: '1' },
        { name: 'species_scope', type: 'varchar', length: '30', isNullable: true },
        { name: 'sample_type', type: 'varchar', length: '50', isNullable: true },
        { name: 'default_charge_amount', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
        { name: 'result_schema', type: 'json', isNullable: true },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'is_active', type: 'tinyint', default: '1' },
      ],
      indices: [
        new TableIndex({ name: 'idx_vpet_lab_template_code', columnNames: ['code'], isUnique: true }),
        new TableIndex({ name: 'idx_vpet_lab_template_active', columnNames: ['is_active'] }),
      ],
    }))
  }

  private async createChronicCaseTable(queryRunner: QueryRunner) {
    const exists = await queryRunner.hasTable('vpet_chronic_case')
    if (exists)
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_chronic_case',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'case_no', type: 'varchar', length: '30', isUnique: true },
        { name: 'customer_id', type: 'int' },
        { name: 'pet_id', type: 'int' },
        { name: 'visit_id', type: 'int', isNullable: true },
        { name: 'disease_name', type: 'varchar', length: '100' },
        { name: 'disease_tags', type: 'json', isNullable: true },
        { name: 'initial_summary', type: 'text', isNullable: true },
        { name: 'management_goal', type: 'text', isNullable: true },
        { name: 'care_plan', type: 'json', isNullable: true },
        { name: 'tracking_schema', type: 'json', isNullable: true },
        { name: 'next_review_date', type: 'date', isNullable: true },
        { name: 'status', type: 'tinyint', default: '1' },
        { name: 'customer_snapshot', type: 'json', isNullable: true },
        { name: 'pet_snapshot', type: 'json', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_vpet_chronic_case_pet', columnNames: ['pet_id'] }),
        new TableIndex({ name: 'idx_vpet_chronic_case_status', columnNames: ['status'] }),
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ],
    }))
  }

  private async createChronicFollowupTable(queryRunner: QueryRunner) {
    const exists = await queryRunner.hasTable('vpet_chronic_followup')
    if (exists)
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_chronic_followup',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'chronic_case_id', type: 'int' },
        { name: 'visit_id', type: 'int', isNullable: true },
        { name: 'review_date', type: 'datetime' },
        { name: 'symptom_summary', type: 'text', isNullable: true },
        { name: 'status_summary', type: 'text', isNullable: true },
        { name: 'metric_values', type: 'json', isNullable: true },
        { name: 'plan_adjustment', type: 'text', isNullable: true },
        { name: 'next_review_date', type: 'date', isNullable: true },
        { name: 'status', type: 'tinyint', default: '1' },
      ],
      indices: [
        new TableIndex({ name: 'idx_vpet_chronic_followup_case', columnNames: ['chronic_case_id'] }),
        new TableIndex({ name: 'idx_vpet_chronic_followup_review', columnNames: ['review_date'] }),
      ],
      foreignKeys: [
        new TableForeignKey({
          columnNames: ['chronic_case_id'],
          referencedTableName: 'vpet_chronic_case',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ],
    }))
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    const table = await queryRunner.getTable(tableName)
    if (!table?.findColumnByName(column.name)) {
      await queryRunner.addColumn(tableName, column)
    }
  }

  private async dropColumnsIfExists(queryRunner: QueryRunner, tableName: string, columnNames: string[]) {
    const table = await queryRunner.getTable(tableName)
    if (!table)
      return
    for (const columnName of columnNames) {
      const column = table.findColumnByName(columnName)
      if (column) {
        await queryRunner.dropColumn(tableName, columnName)
      }
    }
  }
}
