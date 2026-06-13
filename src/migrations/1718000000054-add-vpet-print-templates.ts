import { MigrationInterface, QueryRunner } from 'typeorm'

const templates = [
  {
    code: 'RX_STANDARD_A4',
    name: '标准处方单',
    templateType: 'prescription',
    paperType: 'a4',
    header: '宠物医院处方单\n处方号：{{rxNo}}    类别：{{prescriptionType}}\n宠主：{{customerName}}    宠物：{{petName}}    医生：{{doctorName}}',
    body: '诊断：{{diagnosisSummary}}\n\n处方明细：\n{{itemsTable}}\n\n合计金额：{{totalAmount}} 元',
    footer: '医嘱：请遵医嘱使用药品，如有异常请及时复诊。\n开方时间：{{createdAt}}    医生签名：____________',
    remark: '用于处方管理、门诊病历中的处方单打印。',
  },
  {
    code: 'BILL_RECEIPT_80',
    name: '80mm 收款小票',
    templateType: 'billing_receipt',
    paperType: 'thermal_80',
    header: '宠物医院收款小票\n小票号：{{billNo}}\n宠主：{{customerName}}  宠物：{{petName}}',
    body: '{{itemsTable}}\n应收：{{receivableAmount}} 元\n优惠：{{discount}} 元\n实收：{{paidAmount}} 元\n支付方式：{{paymentMethod}}',
    footer: '收款时间：{{paidAt}}\n感谢信任，祝毛孩子健康。',
    remark: '用于收费结算付款后的收款凭据。',
  },
  {
    code: 'BILL_REFUND_80',
    name: '80mm 退款小票',
    templateType: 'billing_refund',
    paperType: 'thermal_80',
    header: '宠物医院退款小票\n账单号：{{billNo}}\n宠主：{{customerName}}  宠物：{{petName}}',
    body: '退款金额：{{refundAmount}} 元\n退款原因：{{refundReason}}\n原支付金额：{{paidAmount}} 元',
    footer: '退款时间：{{refundedAt}}\n经办人：{{operatorName}}',
    remark: '用于收费结算退款后的退款凭据。',
  },
  {
    code: 'DISPENSE_NOTE_A5',
    name: '发药单',
    templateType: 'dispense_note',
    paperType: 'a5',
    header: '发药单\n处方号：{{rxNo}}    宠物：{{petName}}',
    body: '{{itemsTable}}\n发药人：{{pharmacistName}}',
    footer: '请核对药品名称、数量和用法用量。',
    remark: '用于药房发药核对与交付。',
  },
  {
    code: 'LAB_REPORT_A4',
    name: '检查报告单',
    templateType: 'lab_report',
    paperType: 'a4',
    header: '检查报告单\n报告号：{{orderNo}}    检查项目：{{testName}}',
    body: '{{resultTable}}\n报告摘要：{{reportSummary}}',
    footer: '报告解释需结合病史、体格检查和医生判断。',
    remark: '用于化验、影像和人工检查报告打印。',
  },
  {
    code: 'VISIT_SUMMARY_A4',
    name: '病历摘要单',
    templateType: 'visit_summary',
    paperType: 'a4',
    header: '病历摘要\n就诊号：{{visitNo}}    宠物：{{petName}}',
    body: '主诉：{{chiefComplaint}}\n检查：{{physicalExam}}\n诊断：{{diagnosis}}\n计划：{{treatmentPlan}}',
    footer: '医生签名：____________    打印时间：{{printedAt}}',
    remark: '用于病历摘要或复诊携带资料打印。',
  },
]

const templateTypes = [
  ['prescription', '处方单', '处方开具后的标准处方票据'],
  ['billing_receipt', '收款小票', '收费结算收款后打印的凭据'],
  ['billing_refund', '退款小票', '收费结算退款后打印的凭据'],
  ['dispense_note', '发药单', '药房发药核对与交付票据'],
  ['lab_report', '化验报告', '化验、影像和人工检查报告'],
  ['visit_summary', '病历摘要', '就诊病历摘要或复诊携带资料'],
]

export class AddVpetPrintTemplates1718000000054 implements MigrationInterface {
  name = 'AddVpetPrintTemplates1718000000054'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vpet_print_template (
        id int NOT NULL AUTO_INCREMENT,
        tenant_id int NOT NULL DEFAULT 1 COMMENT '租户 ID',
        area_id int NULL COMMENT '院区 ID，空表示租户通用模板',
        code varchar(60) NOT NULL,
        name varchar(120) NOT NULL,
        template_type varchar(40) NOT NULL,
        paper_type varchar(30) NOT NULL DEFAULT 'a4',
        default_template tinyint NOT NULL DEFAULT 0,
        template_header text NULL,
        template_body text NOT NULL,
        template_footer text NULL,
        style_config json NULL,
        variable_schema json NULL,
        status tinyint NOT NULL DEFAULT 1,
        remark varchar(500) NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_vpet_print_template_code (tenant_id, code),
        KEY idx_vpet_print_template_type (tenant_id, area_id, template_type)
      )
    `)

    for (const item of templates) {
      await queryRunner.query(
        `INSERT INTO vpet_print_template
          (tenant_id, area_id, code, name, template_type, paper_type, default_template, template_header, template_body, template_footer, style_config, variable_schema, status, remark, created_at, updated_at)
         VALUES
          (1, NULL, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          template_type = VALUES(template_type),
          paper_type = VALUES(paper_type),
          default_template = VALUES(default_template),
          template_header = VALUES(template_header),
          template_body = VALUES(template_body),
          template_footer = VALUES(template_footer),
          style_config = VALUES(style_config),
          variable_schema = VALUES(variable_schema),
          status = 1,
          remark = VALUES(remark),
          updated_at = NOW()`,
        [
          item.code,
          item.name,
          item.templateType,
          item.paperType,
          item.header,
          item.body,
          item.footer,
          JSON.stringify({ fontSize: item.paperType.startsWith('thermal') ? 12 : 14, compact: item.paperType.startsWith('thermal') }),
          JSON.stringify({ variables: ['customerName', 'petName', 'doctorName', 'itemsTable', 'totalAmount'] }),
          item.remark,
        ],
      )
    }

    await this.upsertPrintTemplateTypeDict(queryRunner)
    await this.upsertMenu(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM sys_menu WHERE path = '/vpet/print-template' OR permission = 'vpet:print-template:list'`)
    await queryRunner.query(`DROP TABLE IF EXISTS vpet_print_template`)
  }

  private async upsertPrintTemplateTypeDict(queryRunner: QueryRunner) {
    await queryRunner.query(
      `INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
       SELECT '票据模板类型', 'vpet_print_template_type', 1, '宠物医院票据打印模板类型', NULL, NULL, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'vpet_print_template_type')`,
    )
    await queryRunner.query(
      `UPDATE sys_dict_type
       SET name = '票据模板类型', status = 1, remark = '宠物医院票据打印模板类型', updated_at = NOW()
       WHERE code = 'vpet_print_template_type'`,
    )
    const rows = await queryRunner.query(`SELECT id FROM sys_dict_type WHERE code = 'vpet_print_template_type' LIMIT 1`)
    const typeId = rows?.[0]?.id
    if (!typeId)
      return
    for (let index = 0; index < templateTypes.length; index += 1) {
      const [value, label, remark] = templateTypes[index]
      await queryRunner.query(
        `INSERT INTO sys_dict_item (type_id, label, value, orderNo, status, remark, create_by, update_by, created_at, updated_at)
         SELECT ?, ?, ?, ?, 1, ?, NULL, NULL, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE type_id = ? AND value = ?)`,
        [typeId, label, value, index + 1, remark, typeId, value],
      )
      await queryRunner.query(
        `UPDATE sys_dict_item
         SET label = ?, orderNo = ?, status = 1, remark = ?, updated_at = NOW()
         WHERE type_id = ? AND value = ?`,
        [label, index + 1, remark, typeId, value],
      )
    }
  }

  private async upsertMenu(queryRunner: QueryRunner) {
    const parentRows = await queryRunner.query(`SELECT id FROM sys_menu WHERE path = '/vpet/settings' LIMIT 1`)
    const parentId = parentRows?.[0]?.id ?? null
    if (!parentId)
      return

    const existing = await queryRunner.query(`SELECT id FROM sys_menu WHERE path = '/vpet/print-template' LIMIT 1`)
    if (existing?.[0]?.id) {
      await queryRunner.query(
        `UPDATE sys_menu
         SET parent_id = ?, name = '票据模板', permission = 'vpet:print-template:list', type = 1, icon = 'ant-design:printer-outlined',
             order_no = 95, component = 'vpet/print-template/index', keep_alive = 0, \`show\` = 1, status = 1, updated_at = NOW()
         WHERE id = ?`,
        [parentId, existing[0].id],
      )
      return
    }

    await queryRunner.query(
      `INSERT INTO sys_menu
        (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu, created_at, updated_at)
       VALUES
        (?, '/vpet/print-template', '票据模板', 'vpet:print-template:list', 1, 'ant-design:printer-outlined', 95, 'vpet/print-template/index', 0, 1, 1, 0, 1, NULL, NOW(), NOW())`,
      [parentId],
    )
  }
}
