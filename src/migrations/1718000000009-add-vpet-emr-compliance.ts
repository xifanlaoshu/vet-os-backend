import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class AddVpetEmrCompliance1718000000009 implements MigrationInterface {
  name = 'AddVpetEmrCompliance1718000000009'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createEmrAuditLog(queryRunner)
    await this.createEmrUnlockRequest(queryRunner)
    await this.createESignatureRecord(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vpet_e_signature_record', true)
    await queryRunner.dropTable('vpet_emr_unlock_request', true)
    await queryRunner.dropTable('vpet_emr_audit_log', true)
  }

  private async createEmrAuditLog(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_emr_audit_log'))
      return
    await queryRunner.createTable(new Table({
      name: 'vpet_emr_audit_log',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'visit_id', type: 'int' },
        { name: 'emr_id', type: 'int', isNullable: true },
        { name: 'action', type: 'varchar', length: '40' },
        { name: 'before_snapshot', type: 'json', isNullable: true },
        { name: 'after_snapshot', type: 'json', isNullable: true },
        { name: 'reason', type: 'varchar', length: '500', isNullable: true },
        { name: 'operator_id', type: 'int', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_vpet_emr_audit_visit', columnNames: ['visit_id'] }),
        new TableIndex({ name: 'idx_vpet_emr_audit_action', columnNames: ['action'] }),
      ],
    }))
  }

  private async createEmrUnlockRequest(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_emr_unlock_request'))
      return
    await queryRunner.createTable(new Table({
      name: 'vpet_emr_unlock_request',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'visit_id', type: 'int' },
        { name: 'emr_id', type: 'int', isNullable: true },
        { name: 'request_reason', type: 'varchar', length: '500' },
        { name: 'requested_by', type: 'int', isNullable: true },
        { name: 'request_status', type: 'tinyint', default: 1 },
        { name: 'reviewed_by', type: 'int', isNullable: true },
        { name: 'reviewed_at', type: 'datetime', isNullable: true },
        { name: 'review_remark', type: 'varchar', length: '500', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_vpet_emr_unlock_visit', columnNames: ['visit_id'] }),
        new TableIndex({ name: 'idx_vpet_emr_unlock_status', columnNames: ['request_status'] }),
      ],
    }))
  }

  private async createESignatureRecord(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable('vpet_e_signature_record'))
      return
    await queryRunner.createTable(new Table({
      name: 'vpet_e_signature_record',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'visit_id', type: 'int' },
        { name: 'emr_id', type: 'int', isNullable: true },
        { name: 'sign_type', type: 'varchar', length: '40' },
        { name: 'signature_hash', type: 'varchar', length: '128' },
        { name: 'signed_by', type: 'int', isNullable: true },
        { name: 'signed_at', type: 'datetime' },
        { name: 'signed_snapshot', type: 'json', isNullable: true },
        { name: 'status', type: 'tinyint', default: 1 },
      ],
      indices: [
        new TableIndex({ name: 'idx_vpet_e_signature_visit', columnNames: ['visit_id'] }),
        new TableIndex({ name: 'idx_vpet_e_signature_signer', columnNames: ['signed_by'] }),
      ],
    }))
  }
}
