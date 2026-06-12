import { MigrationInterface, QueryRunner } from 'typeorm'

interface ConsentTemplateSeed {
  code: string
  name: string
  category: string
  speciesScope?: string | null
  riskLevel: string
  description: string
  content: string
}

const consentTemplates: ConsentTemplateSeed[] = [
  {
    code: 'CONSENT_ANESTHESIA',
    name: '麻醉知情告知书',
    category: 'anesthesia',
    riskLevel: 'high',
    description: '适用于吸入麻醉、注射麻醉、镇静前风险告知。',
    content: '宠物 {{petName}} 因诊疗需要拟接受麻醉/镇静。家长 {{customerName}} 已知晓麻醉可能存在呕吐误吸、呼吸循环抑制、过敏反应、苏醒延迟、基础疾病诱发风险，医院会根据体况评估并进行监护，但仍无法完全消除风险。日期：{{date}}。',
  },
  {
    code: 'CONSENT_SURGERY_GENERAL',
    name: '常规手术知情告知书',
    category: 'surgery',
    riskLevel: 'high',
    description: '适用于绝育、肿物切除、清创缝合等常规手术。',
    content: '宠物 {{petName}} 拟接受手术治疗。家长已知晓手术可能存在出血、感染、疼痛、伤口裂开、复发、术中方案调整、麻醉相关风险及术后护理不到位导致恢复延迟等情况，并同意医生根据术中实际情况进行必要处理。',
  },
  {
    code: 'CONSENT_DENTAL',
    name: '洁牙拔牙知情告知书',
    category: 'dental',
    riskLevel: 'medium',
    description: '适用于洁牙、牙周治疗、拔牙。',
    content: '宠物 {{petName}} 拟进行口腔治疗。家长已知晓洁牙/拔牙可能出现牙龈出血、牙齿松动需拔除、术后疼痛、进食减少、口腔感染、麻醉镇静风险及需复查护理等情况。',
  },
  {
    code: 'CONSENT_HOSPITALIZATION',
    name: '住院治疗知情告知书',
    category: 'hospitalization',
    riskLevel: 'medium',
    description: '适用于住院观察、重症护理、隔离护理。',
    content: '宠物 {{petName}} 因病情需要住院治疗。家长已知晓住院期间病情可能变化，需要持续观察、复查、调整用药或追加治疗；若出现急危情况，医院将优先采取必要救治并及时沟通费用与方案。',
  },
  {
    code: 'CONSENT_INFUSION',
    name: '输液治疗知情告知书',
    category: 'treatment',
    riskLevel: 'medium',
    description: '适用于静脉输液、皮下补液、连续给药。',
    content: '宠物 {{petName}} 拟接受输液/注射治疗。家长已知晓治疗可能出现药物过敏、局部肿胀疼痛、静脉炎、漏液、输液反应、基础疾病导致治疗反应不佳等风险。',
  },
  {
    code: 'CONSENT_VACCINATION',
    name: '疫苗接种知情告知书',
    category: 'vaccination',
    riskLevel: 'medium',
    description: '适用于犬猫疫苗接种前告知。',
    content: '宠物 {{petName}} 拟进行疫苗接种。家长已知晓接种后可能出现短暂精神食欲下降、注射部位疼痛、发热、过敏反应等情况；接种前需确认近期健康状态，接种后需观察并避免洗澡、剧烈运动。',
  },
  {
    code: 'CONSENT_LAB_SAMPLE',
    name: '采样检查知情告知书',
    category: 'lab',
    riskLevel: 'low',
    description: '适用于抽血、穿刺、拭子、尿液采集等检查采样。',
    content: '宠物 {{petName}} 拟进行采样检查。家长已知晓采样可能出现短暂疼痛、出血、淤青、应激、样本不足需重新采集等情况，检查结果需结合临床表现综合判断。',
  },
  {
    code: 'CONSENT_IMAGING_SEDATION',
    name: '影像检查镇静知情告知书',
    category: 'imaging',
    riskLevel: 'medium',
    description: '适用于 DR、B 超、CT 等需固定或镇静的影像检查。',
    content: '宠物 {{petName}} 拟进行影像检查。若因配合度或疼痛需要镇静，家长已知晓镇静存在呼吸循环抑制、呕吐误吸、苏醒延迟等风险；影像结果需结合体检、化验和病史综合判断。',
  },
  {
    code: 'CONSENT_ISOLATION',
    name: '传染病隔离治疗知情告知书',
    category: 'isolation',
    riskLevel: 'high',
    description: '适用于疑似或确诊传染病隔离诊疗。',
    content: '宠物 {{petName}} 因疑似/确诊传染性疾病需隔离诊疗。家长已知晓疾病可能进展迅速、预后不确定，隔离期间需限制探视并进行环境消毒，相关检查治疗费用按实际发生结算。',
  },
  {
    code: 'CONSENT_EUTHANASIA',
    name: '安乐处理知情告知书',
    category: 'euthanasia',
    riskLevel: 'critical',
    description: '适用于安乐处理前的严肃告知与确认。',
    content: '家长 {{customerName}} 已充分了解宠物 {{petName}} 当前病情、预后和可选方案，经慎重考虑提出安乐处理申请。家长确认该决定真实、自愿，并已知晓安乐处理完成后不可逆。',
  },
]

export class AddVpetConsent1718000000023 implements MigrationInterface {
  name = 'AddVpetConsent1718000000023'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vpet_consent_template (
        id int NOT NULL AUTO_INCREMENT,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        code varchar(50) NOT NULL,
        name varchar(120) NOT NULL,
        category varchar(40) NOT NULL,
        species_scope varchar(30) NULL,
        risk_level varchar(20) NOT NULL DEFAULT 'medium',
        content text NOT NULL,
        variables json NULL,
        description text NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        UNIQUE KEY idx_vpet_consent_template_code (code),
        KEY idx_vpet_consent_template_category (category),
        KEY idx_vpet_consent_template_active (is_active),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vpet_consent_record (
        id int NOT NULL AUTO_INCREMENT,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        record_no varchar(30) NOT NULL,
        template_id int NULL,
        visit_id int NULL,
        customer_id int NOT NULL,
        pet_id int NOT NULL,
        doctor_id int NULL,
        title varchar(120) NOT NULL,
        category varchar(40) NOT NULL,
        risk_level varchar(20) NOT NULL DEFAULT 'medium',
        content_snapshot text NOT NULL,
        template_snapshot json NULL,
        customer_snapshot json NULL,
        pet_snapshot json NULL,
        doctor_snapshot json NULL,
        status tinyint NOT NULL DEFAULT 1,
        guardian_name varchar(50) NULL,
        guardian_phone varchar(20) NULL,
        signed_at datetime NULL,
        signature_data longtext NULL,
        operator_id int NULL,
        remark text NULL,
        UNIQUE KEY idx_vpet_consent_record_no (record_no),
        KEY idx_vpet_consent_record_visit (visit_id),
        KEY idx_vpet_consent_record_status (status),
        KEY idx_vpet_consent_record_customer (customer_id),
        KEY idx_vpet_consent_record_pet (pet_id),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await queryRunner.query(`
      ALTER TABLE vpet_consent_record
        ADD CONSTRAINT fk_vpet_consent_record_template FOREIGN KEY (template_id) REFERENCES vpet_consent_template(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_vpet_consent_record_visit FOREIGN KEY (visit_id) REFERENCES vpet_visit(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_vpet_consent_record_customer FOREIGN KEY (customer_id) REFERENCES vpet_customer(id),
        ADD CONSTRAINT fk_vpet_consent_record_pet FOREIGN KEY (pet_id) REFERENCES vpet_pet(id),
        ADD CONSTRAINT fk_vpet_consent_record_doctor FOREIGN KEY (doctor_id) REFERENCES vpet_doctor(id) ON DELETE SET NULL
    `).catch(() => undefined)

    for (const template of consentTemplates) {
      await queryRunner.query(
        `INSERT INTO vpet_consent_template
          (code, name, category, species_scope, risk_level, content, variables, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          category = VALUES(category),
          species_scope = VALUES(species_scope),
          risk_level = VALUES(risk_level),
          content = VALUES(content),
          variables = VALUES(variables),
          description = VALUES(description),
          is_active = 1`,
        [
          template.code,
          template.name,
          template.category,
          template.speciesScope ?? null,
          template.riskLevel,
          template.content,
          JSON.stringify([
            { key: 'customerName', label: '家长姓名' },
            { key: 'customerPhone', label: '家长电话' },
            { key: 'petName', label: '宠物名称' },
            { key: 'petSpecies', label: '宠物物种' },
            { key: 'petBreed', label: '宠物品种' },
            { key: 'petWeight', label: '宠物体重' },
            { key: 'doctorName', label: '医生姓名' },
            { key: 'visitNo', label: '就诊编号' },
            { key: 'date', label: '告知日期' },
          ]),
          template.description,
        ],
      )
    }

    await this.seedMenu(queryRunner)
    await this.seedDicts(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE path = '/vpet/consent')`)
    await queryRunner.query(`DELETE FROM sys_menu WHERE path = '/vpet/consent'`)
    await queryRunner.query(`DROP TABLE IF EXISTS vpet_consent_record`)
    await queryRunner.query(`DROP TABLE IF EXISTS vpet_consent_template`)
  }

  private async seedMenu(queryRunner: QueryRunner): Promise<void> {
    const rootRows = await queryRunner.query(`SELECT id FROM sys_menu WHERE path = '/vpet' LIMIT 1`)
    const parentId = rootRows?.[0]?.id
    if (!parentId)
      return

    const existingRows = await queryRunner.query(`SELECT id FROM sys_menu WHERE path = '/vpet/consent' LIMIT 1`)
    const values = [
      parentId,
      '/vpet/consent',
      '告知书管理',
      'vpet:consent:list',
      1,
      '',
      26,
      'vpet/consent/index',
      0,
      1,
      1,
      0,
      1,
      null,
    ]
    const existingId = existingRows?.[0]?.id
    if (existingId) {
      await queryRunner.query(
        `UPDATE sys_menu
         SET parent_id = ?, path = ?, name = ?, permission = ?, type = ?, icon = ?, order_no = ?,
             component = ?, keep_alive = ?, \`show\` = ?, status = ?, is_ext = ?, ext_open_mode = ?, active_menu = ?
         WHERE id = ?`,
        [...values, existingId],
      )
    }
    else {
      const result = await queryRunner.query(
        `INSERT INTO sys_menu
          (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values,
      )
      await queryRunner.query(`INSERT IGNORE INTO sys_role_menus (role_id, menu_id) VALUES (1, ?)`, [result?.insertId])
    }

    await queryRunner.query(`
      INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
      SELECT r.id, m.id
      FROM sys_role r
      CROSS JOIN sys_menu m
      WHERE r.id <> 1
        AND r.status = 1
        AND m.path = '/vpet/consent'
    `)
  }

  private async seedDicts(queryRunner: QueryRunner): Promise<void> {
    await this.upsertDict(queryRunner, 'vpet_consent_category', '告知书场景', '宠物诊疗风险告知场景', [
      ['anesthesia', '麻醉镇静', 1],
      ['surgery', '手术治疗', 2],
      ['dental', '口腔治疗', 3],
      ['hospitalization', '住院护理', 4],
      ['treatment', '治疗处置', 5],
      ['vaccination', '疫苗接种', 6],
      ['lab', '采样检查', 7],
      ['imaging', '影像检查', 8],
      ['isolation', '传染病隔离', 9],
      ['euthanasia', '安乐处理', 10],
      ['other', '其他', 99],
    ])
    await this.upsertDict(queryRunner, 'vpet_consent_risk_level', '告知书风险等级', '告知书模板风险等级', [
      ['low', '低风险', 1],
      ['medium', '中风险', 2],
      ['high', '高风险', 3],
      ['critical', '重大风险', 4],
    ])
    await this.upsertDict(queryRunner, 'vpet_consent_record_status', '告知书签署状态', '告知书记录签署状态', [
      ['1', '待签署', 1],
      ['2', '已签署', 2],
      ['3', '已作废', 3],
    ])
  }

  private async upsertDict(queryRunner: QueryRunner, code: string, name: string, remark: string, items: Array<[string, string, number]>): Promise<void> {
    await queryRunner.query(
      `INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
       SELECT ?, ?, 1, ?, 1, 1, NOW(), NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = ?)`,
      [name, code, remark, code],
    )
    await queryRunner.query(
      `UPDATE sys_dict_type SET name = ?, status = 1, remark = ?, updated_at = NOW() WHERE code = ?`,
      [name, remark, code],
    )
    const typeRows = await queryRunner.query(`SELECT id FROM sys_dict_type WHERE code = ? LIMIT 1`, [code])
    const typeId = typeRows?.[0]?.id
    if (!typeId)
      return
    for (const [value, label, orderNo] of items) {
      await queryRunner.query(
        `INSERT INTO sys_dict_item (type_id, label, value, status, orderNo, remark, create_by, update_by, created_at, updated_at)
         SELECT ?, ?, ?, 1, ?, ?, 1, 1, NOW(), NOW()
         FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM sys_dict_item WHERE type_id = ? AND value = ?)`,
        [typeId, label, value, orderNo, label, typeId, value],
      )
      await queryRunner.query(
        `UPDATE sys_dict_item
         SET label = ?, status = 1, orderNo = ?, remark = ?, updated_at = NOW()
         WHERE type_id = ? AND value = ?`,
        [label, orderNo, label, typeId, value],
      )
    }
  }
}
