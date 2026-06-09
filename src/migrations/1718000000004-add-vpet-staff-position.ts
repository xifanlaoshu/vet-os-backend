import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

const DICT_CODE = 'vpet_staff_position'

const DICT_ITEMS = [
  { label: '医生', value: 'doctor', orderNo: 1, remark: '医护人员岗位：医生' },
  { label: '医助', value: 'assistant', orderNo: 2, remark: '医护人员岗位：医助' },
  { label: '前台', value: 'reception', orderNo: 3, remark: '医护人员岗位：前台' },
  { label: '美容师', value: 'groomer', orderNo: 4, remark: '医护人员岗位：美容师' },
]

export class AddVpetStaffPosition1718000000004 implements MigrationInterface {
  name = 'AddVpetStaffPosition1718000000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('vpet_doctor', 'position')
    if (!hasColumn) {
      await queryRunner.addColumn(
        'vpet_doctor',
        new TableColumn({
          name: 'position',
          type: 'varchar',
          length: '32',
          isNullable: false,
          default: `'doctor'`,
          comment: '医护人员岗位字典值',
        }),
      )
    }

    await queryRunner.query(
      `
        INSERT INTO sys_dict_type (name, code, status, remark, create_by, update_by, created_at, updated_at)
        SELECT ?, ?, 1, ?, 1, 1, NOW(), NOW()
        FROM DUAL
        WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = ?)
      `,
      ['医护人员岗位', DICT_CODE, '医护人员岗位分类', DICT_CODE],
    )

    for (const item of DICT_ITEMS) {
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
    }

    await queryRunner.query(
      `
        UPDATE vpet_doctor
        SET position = 'doctor'
        WHERE position IS NULL OR position = ''
      `,
    )
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
    await queryRunner.query(`DELETE FROM sys_dict_type WHERE code = ?`, [DICT_CODE])

    const hasColumn = await queryRunner.hasColumn('vpet_doctor', 'position')
    if (hasColumn) {
      await queryRunner.dropColumn('vpet_doctor', 'position')
    }
  }
}
