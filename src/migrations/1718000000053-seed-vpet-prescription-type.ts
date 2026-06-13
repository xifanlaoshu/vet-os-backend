import { MigrationInterface, QueryRunner } from 'typeorm'

const DICT_CODE = 'vpet_prescription_type'

const DICT = {
  name: '处方类别',
  remark: '宠物医院处方使用场景分类',
  items: [
    { label: '院内诊疗处方', value: '1', orderNo: 1, remark: '用于门诊、住院、输液等院内诊疗过程的处方' },
    { label: '手术/麻醉处方', value: '2', orderNo: 2, remark: '用于手术、麻醉、术中及围术期用药或服务项目的处方' },
    { label: '家长外带处方', value: '3', orderNo: 3, remark: '用于宠主带回家执行的药品、护理或复诊相关处方' },
  ],
}

export class SeedVpetPrescriptionType1718000000053 implements MigrationInterface {
  name = 'SeedVpetPrescriptionType1718000000053'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
        SELECT ?, ?, 1, ?, 1, 1, NOW(), NOW()
        FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = ?)
      `,
      [DICT.name, DICT_CODE, DICT.remark, DICT_CODE],
    )

    await queryRunner.query(
      `
        UPDATE sys_dict_type
        SET name = ?, status = 1, remark = ?, updated_at = NOW()
        WHERE code = ?
      `,
      [DICT.name, DICT.remark, DICT_CODE],
    )

    for (const item of DICT.items) {
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
        [item.label, item.value, item.orderNo, item.remark, DICT_CODE, item.value],
      )
      await queryRunner.query(
        `
          UPDATE sys_dict_item i
          INNER JOIN sys_dict_type t ON t.id = i.type_id
          SET i.label = ?, i.orderNo = ?, i.status = 1, i.remark = ?, i.updated_at = NOW()
          WHERE t.code = ? AND i.value = ?
        `,
        [item.label, item.orderNo, item.remark, DICT_CODE, item.value],
      )
    }

    if (await queryRunner.hasTable('vpet_prescription')) {
      await queryRunner.query(`
        UPDATE vpet_prescription
        SET type = 1
        WHERE type IS NULL OR type NOT IN (1, 2, 3)
      `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DELETE i
        FROM sys_dict_item i
        INNER JOIN sys_dict_type t ON t.id = i.type_id
        WHERE t.code = ?
      `,
      [DICT_CODE],
    )
    await queryRunner.query('DELETE FROM sys_dict_type WHERE code = ?', [DICT_CODE])
  }
}
