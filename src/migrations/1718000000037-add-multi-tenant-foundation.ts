import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm'

export class AddMultiTenantFoundation1718000000037 implements MigrationInterface {
  name = 'AddMultiTenantFoundation1718000000037'

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (await queryRunner.hasTable(tableName) && !(await queryRunner.hasColumn(tableName, column.name)))
      await queryRunner.addColumn(tableName, column)
  }

  private async addIndexIfMissing(queryRunner: QueryRunner, tableName: string, index: TableIndex) {
    if (!(await queryRunner.hasTable(tableName)))
      return
    const table = await queryRunner.getTable(tableName)
    if (!table?.indices.some(item => item.name === index.name))
      await queryRunner.createIndex(tableName, index)
  }

  private indexName(tableName: string, suffix: string) {
    const name = `idx_${tableName}_${suffix}`
    return name.length > 60 ? name.slice(0, 60) : name
  }

  private tenantColumn() {
    return new TableColumn({
      name: 'tenant_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '租户 ID',
    })
  }

  private areaColumn() {
    return new TableColumn({
      name: 'area_id',
      type: 'bigint',
      isNullable: false,
      default: 1,
      comment: '院区 ID',
    })
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('sys_tenant'))) {
      await queryRunner.createTable(new Table({
        name: 'sys_tenant',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'code', type: 'varchar', length: '64', isNullable: false },
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          { name: 'short_name', type: 'varchar', length: '80', isNullable: true },
          { name: 'contact_name', type: 'varchar', length: '80', isNullable: true },
          { name: 'contact_phone', type: 'varchar', length: '30', isNullable: true },
          { name: 'region', type: 'varchar', length: '120', isNullable: true },
          { name: 'address', type: 'varchar', length: '255', isNullable: true },
          { name: 'edition', type: 'varchar', length: '40', isNullable: true },
          { name: 'status', type: 'tinyint', default: 1 },
          { name: 'remark', type: 'varchar', length: '500', isNullable: true },
          { name: 'create_by', type: 'bigint', isNullable: true },
          { name: 'update_by', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          { name: 'uk_sys_tenant_code', columnNames: ['code'], isUnique: true },
        ],
      }))
    }

    if (!(await queryRunner.hasTable('sys_tenant_area'))) {
      await queryRunner.createTable(new Table({
        name: 'sys_tenant_area',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'tenant_id', type: 'bigint', isNullable: false },
          { name: 'code', type: 'varchar', length: '64', isNullable: false },
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          { name: 'short_name', type: 'varchar', length: '80', isNullable: true },
          { name: 'contact_phone', type: 'varchar', length: '30', isNullable: true },
          { name: 'region', type: 'varchar', length: '120', isNullable: true },
          { name: 'address', type: 'varchar', length: '255', isNullable: true },
          { name: 'business_hours', type: 'json', isNullable: true },
          { name: 'default_area', type: 'tinyint', default: 0 },
          { name: 'status', type: 'tinyint', default: 1 },
          { name: 'sort_no', type: 'int', default: 0 },
          { name: 'remark', type: 'varchar', length: '500', isNullable: true },
          { name: 'create_by', type: 'bigint', isNullable: true },
          { name: 'update_by', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          { name: 'idx_sys_tenant_area_tenant', columnNames: ['tenant_id'] },
          { name: 'uk_sys_tenant_area_code', columnNames: ['tenant_id', 'code'], isUnique: true },
        ],
      }))
    }

    if (!(await queryRunner.hasTable('sys_user_areas'))) {
      await queryRunner.createTable(new Table({
        name: 'sys_user_areas',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'bigint', isNullable: false },
          { name: 'tenant_id', type: 'bigint', isNullable: false },
          { name: 'area_id', type: 'bigint', isNullable: false },
          { name: 'default_area', type: 'tinyint', default: 0 },
        ],
        indices: [
          { name: 'idx_sys_user_areas_user', columnNames: ['user_id'] },
          { name: 'idx_sys_user_areas_tenant', columnNames: ['tenant_id'] },
          { name: 'idx_sys_user_areas_area', columnNames: ['area_id'] },
          { name: 'uk_sys_user_area', columnNames: ['user_id', 'tenant_id', 'area_id'], isUnique: true },
        ],
      }))
    }

    if (!(await queryRunner.hasTable('sys_login_account'))) {
      await queryRunner.createTable(new Table({
        name: 'sys_login_account',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'login_name', type: 'varchar', length: '80', isNullable: false },
          { name: 'phone', type: 'varchar', length: '30', isNullable: true },
          { name: 'email', type: 'varchar', length: '120', isNullable: true },
          { name: 'password_hash', type: 'varchar', length: '255', isNullable: false },
          { name: 'account_type', type: 'varchar', length: '20', default: '\'tenant\'' },
          { name: 'status', type: 'tinyint', default: 1 },
          { name: 'last_login_at', type: 'datetime', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          { name: 'uk_login_account_name', columnNames: ['login_name'], isUnique: true },
        ],
      }))
    }

    if (!(await queryRunner.hasTable('sys_account_tenant_users'))) {
      await queryRunner.createTable(new Table({
        name: 'sys_account_tenant_users',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'account_id', type: 'bigint', isNullable: false },
          { name: 'tenant_id', type: 'bigint', isNullable: false },
          { name: 'user_id', type: 'bigint', isNullable: false },
          { name: 'default_tenant', type: 'tinyint', default: 0 },
          { name: 'last_area_id', type: 'bigint', isNullable: true },
          { name: 'status', type: 'tinyint', default: 1 },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          { name: 'uk_account_tenant', columnNames: ['account_id', 'tenant_id'], isUnique: true },
          { name: 'uk_tenant_user', columnNames: ['tenant_id', 'user_id'], isUnique: true },
        ],
      }))
    }

    await queryRunner.query(`
      INSERT INTO sys_tenant (id, code, name, short_name, status, edition, created_at, updated_at)
      VALUES (1, 'default-hospital', '默认医院', '默认医院', 1, 'standard', NOW(), NOW())
      ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), updated_at = NOW()
    `)

    await queryRunner.query(`
      INSERT INTO sys_tenant_area (id, tenant_id, code, name, short_name, default_area, status, sort_no, created_at, updated_at)
      VALUES (1, 1, 'default-area', '默认院区', '默认院区', 1, 1, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE name = VALUES(name), default_area = VALUES(default_area), status = VALUES(status), updated_at = NOW()
    `)

    const tenantTables = [
      'sys_user',
      'sys_role',
      'sys_dept',
      'sys_dict_type',
      'sys_dict_item',
      'sys_config',
      'sys_param_config',
      'sys_login_log',
      'vpet_customer',
      'vpet_pet',
      'vpet_species',
      'vpet_breed',
      'vpet_diagnosis_code',
      'vpet_doctor',
      'vpet_drug',
      'vpet_charge_item',
      'vpet_service_item',
      'vpet_lab_template',
      'vpet_consent_template',
      'vpet_prescription_template',
      'vpet_prescription_template_item',
      'vpet_member_account',
    ]

    const areaTables = [
      'vpet_appointment',
      'vpet_shift',
      'vpet_staff_schedule',
      'vpet_visit',
      'vpet_visit_emr',
      'vpet_visit_diagnosis',
      'vpet_visit_queue_event',
      'vpet_visit_care_followup',
      'vpet_visit_care_followup_lab',
      'vpet_visit_care_followup_prescription',
      'vpet_visit_progress_batch',
      'vpet_visit_plan_batch',
      'vpet_visit_media_batch',
      'vpet_visit_media_file',
      'vpet_chronic_case',
      'vpet_chronic_followup',
      'vpet_emr_audit_log',
      'vpet_emr_unlock_request',
      'vpet_e_signature_record',
      'vpet_lab_order',
      'vpet_lab_result_item',
      'vpet_lis_order',
      'vpet_prescription',
      'vpet_rx_detail',
      'vpet_prescription_item',
      'vpet_billing',
      'vpet_billing_item',
      'vpet_billing_payment',
      'vpet_bill_detail',
      'vpet_payment',
      'vpet_drug_batch',
      'vpet_drug_stock_txn',
      'vpet_store',
      'vpet_store_stock',
      'vpet_store_transfer',
      'vpet_hospitalization',
      'vpet_hosp_nursing_plan',
      'vpet_hosp_nursing_execution',
      'vpet_reminder',
      'vpet_consent_record',
      'vpet_insurance_claim',
      'vpet_ai_log',
    ]

    for (const tableName of [...tenantTables, ...areaTables]) {
      await this.addColumnIfMissing(queryRunner, tableName, this.tenantColumn())
      await this.addIndexIfMissing(queryRunner, tableName, new TableIndex({
        name: this.indexName(tableName, 'tenant_id'),
        columnNames: ['tenant_id'],
      }))
    }

    for (const tableName of areaTables) {
      await this.addColumnIfMissing(queryRunner, tableName, this.areaColumn())
      await this.addIndexIfMissing(queryRunner, tableName, new TableIndex({
        name: this.indexName(tableName, 'tenant_area'),
        columnNames: ['tenant_id', 'area_id'],
      }))
    }

    await this.addColumnIfMissing(queryRunner, 'vpet_customer', new TableColumn({
      name: 'home_area_id',
      type: 'bigint',
      isNullable: true,
      comment: '常用院区 ID',
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_pet', new TableColumn({
      name: 'home_area_id',
      type: 'bigint',
      isNullable: true,
      comment: '常用院区 ID',
    }))

    if (await queryRunner.hasTable('sys_user')) {
      await queryRunner.query(`
        INSERT INTO sys_user_areas (user_id, tenant_id, area_id, default_area)
        SELECT u.id, 1, 1, 1
        FROM sys_user u
        WHERE NOT EXISTS (
          SELECT 1 FROM sys_user_areas ua
          WHERE ua.user_id = u.id AND ua.tenant_id = 1 AND ua.area_id = 1
        )
      `)

      await queryRunner.query(`
        INSERT INTO sys_login_account (login_name, phone, email, password_hash, account_type, status, created_at, updated_at)
        SELECT u.username, u.phone, u.email, u.password, 'tenant', u.status, NOW(), NOW()
        FROM sys_user u
        WHERE NOT EXISTS (
          SELECT 1 FROM sys_login_account a WHERE a.login_name = u.username
        )
      `)

      await queryRunner.query(`
        INSERT INTO sys_account_tenant_users (account_id, tenant_id, user_id, default_tenant, last_area_id, status, created_at, updated_at)
        SELECT a.id, 1, u.id, 1, 1, u.status, NOW(), NOW()
        FROM sys_user u
        INNER JOIN sys_login_account a ON a.login_name = u.username
        WHERE NOT EXISTS (
          SELECT 1 FROM sys_account_tenant_users atu
          WHERE atu.tenant_id = 1 AND atu.user_id = u.id
        )
      `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const areaTables = [
      'vpet_appointment',
      'vpet_shift',
      'vpet_staff_schedule',
      'vpet_visit',
      'vpet_visit_emr',
      'vpet_visit_diagnosis',
      'vpet_visit_care_followup',
      'vpet_lab_order',
      'vpet_prescription',
      'vpet_billing',
      'vpet_drug_batch',
      'vpet_drug_stock_txn',
      'vpet_hospitalization',
      'vpet_reminder',
      'vpet_consent_record',
    ]
    const tenantTables = [
      'sys_user',
      'sys_role',
      'sys_dept',
      'sys_dict_type',
      'sys_dict_item',
      'sys_param_config',
      'vpet_customer',
      'vpet_pet',
      'vpet_doctor',
      'vpet_drug',
      'vpet_lab_template',
      'vpet_consent_template',
      'vpet_prescription_template',
    ]

    for (const tableName of areaTables) {
      if (await queryRunner.hasTable(tableName) && await queryRunner.hasColumn(tableName, 'area_id'))
        await queryRunner.dropColumn(tableName, 'area_id')
    }

    for (const tableName of [...tenantTables, ...areaTables]) {
      if (await queryRunner.hasTable(tableName) && await queryRunner.hasColumn(tableName, 'tenant_id'))
        await queryRunner.dropColumn(tableName, 'tenant_id')
    }

    if (await queryRunner.hasTable('vpet_customer') && await queryRunner.hasColumn('vpet_customer', 'home_area_id'))
      await queryRunner.dropColumn('vpet_customer', 'home_area_id')
    if (await queryRunner.hasTable('vpet_pet') && await queryRunner.hasColumn('vpet_pet', 'home_area_id'))
      await queryRunner.dropColumn('vpet_pet', 'home_area_id')

    for (const tableName of ['sys_account_tenant_users', 'sys_login_account', 'sys_user_areas', 'sys_tenant_area', 'sys_tenant']) {
      if (await queryRunner.hasTable(tableName))
        await queryRunner.dropTable(tableName)
    }
  }
}
