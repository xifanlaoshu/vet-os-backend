import { MigrationInterface, QueryRunner } from 'typeorm'

const legacyAssociations: Record<string, string[]> = {
  'SVC-SUR-001': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-002': ['CONSENT_NEUTER', 'CONSENT_ANESTHESIA', 'CONSENT_SURGERY_GENERAL'],
  'SVC-SUR-003': ['CONSENT_SURGERY_GENERAL', 'CONSENT_ANESTHESIA'],
  'SVC-NUR-001': ['CONSENT_INJECTION'],
  'SVC-NUR-002': ['CONSENT_INFUSION'],
  'SVC-NUR-003': ['CONSENT_WOUND_DEBRIDEMENT', 'CONSENT_HOME_CARE'],
  'SVC-TRT-001': ['CONSENT_OXYGEN_NEBULIZATION'],
  'SVC-TRT-002': ['CONSENT_EXAM_GENERAL'],
  'SVC-EXM-001': ['CONSENT_REGISTRATION_TRIAGE', 'CONSENT_EXAM_GENERAL'],
  'SVC-EXM-002': ['CONSENT_EXAM_GENERAL', 'CONSENT_LAB_SAMPLE'],
  'SVC-GRM-001': ['CONSENT_GROOMING'],
  'SVC-GRM-002': ['CONSENT_GROOMING'],
}

export class SeedLegacyVpetServiceConsentLinks1718000000026 implements MigrationInterface {
  name = 'SeedLegacyVpetServiceConsentLinks1718000000026'

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [itemCode, templateCodes] of Object.entries(legacyAssociations)) {
      for (const templateCode of templateCodes) {
        await queryRunner.query(
          `INSERT IGNORE INTO vpet_consent_template_charge_item (charge_item_id, template_id)
           SELECT item.id, template.id
           FROM vpet_charge_item item
           INNER JOIN vpet_consent_template template ON template.code = ?
           WHERE item.item_code = ?`,
          [templateCode, itemCode],
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [itemCode, templateCodes] of Object.entries(legacyAssociations)) {
      await queryRunner.query(
        `DELETE link
         FROM vpet_consent_template_charge_item link
         INNER JOIN vpet_charge_item item ON item.id = link.charge_item_id
         INNER JOIN vpet_consent_template template ON template.id = link.template_id
         WHERE item.item_code = ? AND template.code IN (${templateCodes.map(() => '?').join(',')})`,
        [itemCode, ...templateCodes],
      )
    }
  }
}
