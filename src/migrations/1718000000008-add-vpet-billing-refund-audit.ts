import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

const PAYMENT_DIRECTION_DICT = {
  name: '支付流水方向',
  code: 'vpet_payment_direction',
  remark: '收费支付流水方向选项',
  items: [
    { label: '收款', value: '1', orderNo: 1, remark: '支付流水方向：收款' },
    { label: '退款', value: '2', orderNo: 2, remark: '支付流水方向：退款' },
  ],
}

export class AddVpetBillingRefundAudit1718000000008 implements MigrationInterface {
  name = 'AddVpetBillingRefundAudit1718000000008'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createOperationAuditLog(queryRunner)
    await this.seedPaymentDirectionDict(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.deletePaymentDirectionDict(queryRunner)
    await queryRunner.dropTable('vpet_operation_audit_log', true)
  }

  private async createOperationAuditLog(queryRunner: QueryRunner) {
    const exists = await queryRunner.hasTable('vpet_operation_audit_log')
    if (exists)
      return

    await queryRunner.createTable(new Table({
      name: 'vpet_operation_audit_log',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'biz_type', type: 'varchar', length: '40' },
        { name: 'biz_id', type: 'int' },
        { name: 'action', type: 'varchar', length: '40' },
        { name: 'before_snapshot', type: 'json', isNullable: true },
        { name: 'after_snapshot', type: 'json', isNullable: true },
        { name: 'reason', type: 'varchar', length: '500', isNullable: true },
        { name: 'operator_id', type: 'int', isNullable: true },
      ],
      indices: [
        new TableIndex({ name: 'idx_vpet_operation_audit_biz', columnNames: ['biz_type', 'biz_id'] }),
        new TableIndex({ name: 'idx_vpet_operation_audit_action', columnNames: ['action'] }),
      ],
    }))
  }

  private async seedPaymentDirectionDict(queryRunner: QueryRunner) {
    await queryRunner.query(
      `
        INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
        SELECT ?, ?, 1, ?, 1, 1, NOW(), NOW()
        FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = ?)
      `,
      [
        PAYMENT_DIRECTION_DICT.name,
        PAYMENT_DIRECTION_DICT.code,
        PAYMENT_DIRECTION_DICT.remark,
        PAYMENT_DIRECTION_DICT.code,
      ],
    )

    for (const item of PAYMENT_DIRECTION_DICT.items) {
      await queryRunner.query(
        `
          INSERT INTO sys_dict_item (type_id, label, value, orderNo, status, remark, create_by, update_by, created_at, updated_at)
          SELECT t.id, ?, ?, ?, 1, ?, 1, 1, NOW(), NOW()
          FROM sys_dict_type t
          WHERE t.code = ?
            AND NOT EXISTS (
              SELECT 1 FROM sys_dict_item i
              WHERE i.type_id = t.id AND i.value = ?
            )
        `,
        [item.label, item.value, item.orderNo, item.remark, PAYMENT_DIRECTION_DICT.code, item.value],
      )
    }
  }

  private async deletePaymentDirectionDict(queryRunner: QueryRunner) {
    await queryRunner.query(
      `
        DELETE i
        FROM sys_dict_item i
        INNER JOIN sys_dict_type t ON t.id = i.type_id
        WHERE t.code = ?
      `,
      [PAYMENT_DIRECTION_DICT.code],
    )
    await queryRunner.query('DELETE FROM sys_dict_type WHERE code = ?', [PAYMENT_DIRECTION_DICT.code])
  }
}
