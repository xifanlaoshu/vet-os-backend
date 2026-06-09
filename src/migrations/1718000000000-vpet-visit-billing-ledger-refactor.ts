import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm'

export class VpetVisitBillingLedgerRefactor1718000000000 implements MigrationInterface {
  name = 'VpetVisitBillingLedgerRefactor1718000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureVisitColumns(queryRunner)
    await this.ensureBillDetailColumns(queryRunner)
    await this.ensureVisitEmrTable(queryRunner)
    await this.ensureVisitDiagnosisTable(queryRunner)
    await this.ensureVisitQueueEventTable(queryRunner)
    await this.ensureBillingPaymentTable(queryRunner)
    await this.ensureDrugStockTxnTable(queryRunner)
  }

  public async down(): Promise<void> {
    // no-op
  }

  private async ensureVisitColumns(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn('vpet_visit', 'appointment_id'))) {
      await queryRunner.addColumn(
        'vpet_visit',
        new TableColumn({
          name: 'appointment_id',
          type: 'int',
          isNullable: true,
        }),
      )
    }

    const visitTable = await queryRunner.getTable('vpet_visit')
    const hasAppointmentIndex = visitTable?.indices.some(index => index.name === 'idx_visit_appointment')
    if (!hasAppointmentIndex) {
      await queryRunner.createIndex(
        'vpet_visit',
        new TableIndex({
          name: 'idx_visit_appointment',
          columnNames: ['appointment_id'],
        }),
      )
    }
  }

  private async ensureBillDetailColumns(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn('vpet_bill_detail', 'source_type'))) {
      await queryRunner.addColumn(
        'vpet_bill_detail',
        new TableColumn({
          name: 'source_type',
          type: 'varchar',
          length: '30',
          isNullable: true,
        }),
      )
    }

    if (!(await queryRunner.hasColumn('vpet_bill_detail', 'source_id'))) {
      await queryRunner.addColumn(
        'vpet_bill_detail',
        new TableColumn({
          name: 'source_id',
          type: 'int',
          isNullable: true,
        }),
      )
    }

    if (!(await queryRunner.hasColumn('vpet_bill_detail', 'item_snapshot'))) {
      await queryRunner.addColumn(
        'vpet_bill_detail',
        new TableColumn({
          name: 'item_snapshot',
          type: 'json',
          isNullable: true,
        }),
      )
    }
  }

  private async ensureVisitEmrTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_emr'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_emr',
      columns: [
        this.idColumn(),
        { name: 'visit_id', type: 'int' },
        { name: 'chief_complaint', type: 'text', isNullable: true },
        { name: 'physical_exam', type: 'json', isNullable: true },
        { name: 'assessment_text', type: 'text', isNullable: true },
        { name: 'plan_text', type: 'text', isNullable: true },
        { name: 'doctor_advice', type: 'text', isNullable: true },
        { name: 'locked', type: 'tinyint', default: '0' },
        { name: 'locked_at', type: 'datetime', isNullable: true },
        { name: 'quality_score', type: 'tinyint', isNullable: true },
        this.createdAtColumn(),
        this.updatedAtColumn(),
      ],
      indices: [
        { name: 'idx_visit_emr_visit', columnNames: ['visit_id'], isUnique: true },
      ],
      foreignKeys: [
        {
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }))
  }

  private async ensureVisitDiagnosisTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_diagnosis'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_diagnosis',
      columns: [
        this.idColumn(),
        { name: 'visit_id', type: 'int' },
        { name: 'diagnosis_code', type: 'varchar', length: '30', isNullable: true },
        { name: 'diagnosis_name', type: 'varchar', length: '100' },
        { name: 'diagnosis_type', type: 'tinyint', default: '1' },
        { name: 'sort_no', type: 'int', default: '0' },
        { name: 'is_primary', type: 'tinyint', default: '0' },
        this.createdAtColumn(),
        this.updatedAtColumn(),
      ],
      indices: [
        { name: 'idx_visit_diagnosis_visit', columnNames: ['visit_id'] },
      ],
      foreignKeys: [
        {
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }))
  }

  private async ensureVisitQueueEventTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_visit_queue_event'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_visit_queue_event',
      columns: [
        this.idColumn(),
        { name: 'visit_id', type: 'int' },
        { name: 'event_type', type: 'tinyint' },
        { name: 'queue_no', type: 'int', isNullable: true },
        { name: 'operator_id', type: 'int', isNullable: true },
        { name: 'event_time', type: 'datetime' },
        { name: 'remark', type: 'varchar', length: '200', isNullable: true },
        this.createdAtColumn(),
        this.updatedAtColumn(),
      ],
      indices: [
        { name: 'idx_visit_queue_event_visit', columnNames: ['visit_id'] },
        { name: 'idx_visit_queue_event_time', columnNames: ['event_time'] },
      ],
      foreignKeys: [
        {
          columnNames: ['visit_id'],
          referencedTableName: 'vpet_visit',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }))
  }

  private async ensureBillingPaymentTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_billing_payment'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_billing_payment',
      columns: [
        this.idColumn(),
        { name: 'billing_id', type: 'int' },
        { name: 'payment_method', type: 'tinyint' },
        { name: 'amount', type: 'decimal', precision: 10, scale: 2 },
        { name: 'direction', type: 'tinyint', default: '1' },
        { name: 'trade_no', type: 'varchar', length: '64', isNullable: true },
        { name: 'operator_id', type: 'int', isNullable: true },
        { name: 'paid_at', type: 'datetime' },
        { name: 'status', type: 'tinyint', default: '1' },
        { name: 'remark', type: 'varchar', length: '200', isNullable: true },
        this.createdAtColumn(),
        this.updatedAtColumn(),
      ],
      indices: [
        { name: 'idx_billing_payment_bill', columnNames: ['billing_id'] },
        { name: 'idx_billing_payment_paid_at', columnNames: ['paid_at'] },
      ],
      foreignKeys: [
        {
          columnNames: ['billing_id'],
          referencedTableName: 'vpet_billing',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }))
  }

  private async ensureDrugStockTxnTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_drug_stock_txn'))
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_drug_stock_txn',
      columns: [
        this.idColumn(),
        { name: 'drug_id', type: 'int' },
        { name: 'batch_id', type: 'int', isNullable: true },
        { name: 'txn_type', type: 'tinyint' },
        { name: 'ref_type', type: 'varchar', length: '50', isNullable: true },
        { name: 'ref_id', type: 'int', isNullable: true },
        { name: 'quantity_before', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
        { name: 'quantity_change', type: 'decimal', precision: 10, scale: 2 },
        { name: 'quantity_after', type: 'decimal', precision: 10, scale: 2, default: '0.00' },
        { name: 'operator_id', type: 'int', isNullable: true },
        { name: 'txn_time', type: 'datetime' },
        this.createdAtColumn(),
        this.updatedAtColumn(),
      ],
      indices: [
        { name: 'idx_drug_stock_txn_drug', columnNames: ['drug_id'] },
        { name: 'idx_drug_stock_txn_time', columnNames: ['txn_time'] },
      ],
      foreignKeys: [
        {
          columnNames: ['drug_id'],
          referencedTableName: 'vpet_drug',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['batch_id'],
          referencedTableName: 'vpet_drug_batch',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        },
      ],
    }))
  }

  private idColumn() {
    return {
      name: 'id',
      type: 'int',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'increment' as const,
    }
  }

  private createdAtColumn() {
    return {
      name: 'created_at',
      type: 'datetime',
      precision: 6,
      default: 'CURRENT_TIMESTAMP(6)',
    }
  }

  private updatedAtColumn() {
    return {
      name: 'updated_at',
      type: 'datetime',
      precision: 6,
      default: 'CURRENT_TIMESTAMP(6)',
      onUpdate: 'CURRENT_TIMESTAMP(6)',
    }
  }
}
