import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm'

export class AddVpetShiftSchedule1718000000034 implements MigrationInterface {
  name = 'AddVpetShiftSchedule1718000000034'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasShift = await queryRunner.hasTable('vpet_shift')
    if (!hasShift) {
      await queryRunner.createTable(new Table({
        name: 'vpet_shift',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'code', type: 'varchar', length: '40' },
          { name: 'name', type: 'varchar', length: '80' },
          { name: 'startTime', type: 'time' },
          { name: 'endTime', type: 'time' },
          { name: 'color', type: 'varchar', length: '20', default: '\'#1677ff\'' },
          { name: 'status', type: 'tinyint', default: 1 },
          { name: 'remark', type: 'varchar', length: '200', isNullable: true },
        ],
      }))
      await queryRunner.createIndex('vpet_shift', new TableIndex({ name: 'idx_vpet_shift_code', columnNames: ['code'], isUnique: true }))
      await queryRunner.createIndex('vpet_shift', new TableIndex({ name: 'idx_vpet_shift_status', columnNames: ['status'] }))
    }

    const hasSchedule = await queryRunner.hasTable('vpet_staff_schedule')
    if (!hasSchedule) {
      await queryRunner.createTable(new Table({
        name: 'vpet_staff_schedule',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'doctorId', type: 'int' },
          { name: 'scheduleDate', type: 'date' },
          { name: 'shiftId', type: 'int', isNullable: true },
          { name: 'remark', type: 'varchar', length: '200', isNullable: true },
        ],
      }))
      await queryRunner.createIndex('vpet_staff_schedule', new TableIndex({ name: 'idx_vpet_staff_schedule_date', columnNames: ['scheduleDate'] }))
      await queryRunner.createIndex('vpet_staff_schedule', new TableIndex({ name: 'idx_vpet_staff_schedule_doctor_date', columnNames: ['doctorId', 'scheduleDate'], isUnique: true }))
      await queryRunner.createForeignKey('vpet_staff_schedule', new TableForeignKey({
        name: 'fk_vpet_staff_schedule_doctor',
        columnNames: ['doctorId'],
        referencedTableName: 'vpet_doctor',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }))
      await queryRunner.createForeignKey('vpet_staff_schedule', new TableForeignKey({
        name: 'fk_vpet_staff_schedule_shift',
        columnNames: ['shiftId'],
        referencedTableName: 'vpet_shift',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }))
    }

    await this.seedDefaultShifts(queryRunner)
    await this.seedMenus(queryRunner)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE path IN (?, ?))`,
      ['/vpet/shift', '/vpet/schedule'],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE path IN (?, ?)', ['/vpet/shift', '/vpet/schedule'])
    if (await queryRunner.hasTable('vpet_staff_schedule'))
      await queryRunner.dropTable('vpet_staff_schedule', true)
    if (await queryRunner.hasTable('vpet_shift'))
      await queryRunner.dropTable('vpet_shift', true)
  }

  private async seedDefaultShifts(queryRunner: QueryRunner) {
    const rows = [
      ['DAY', '白班', '09:00:00', '18:00:00', '#1677ff', 1, '社区门诊常规白班'],
      ['MORNING', '早班', '08:00:00', '16:00:00', '#13c2c2', 1, '早到接诊和住院护理班'],
      ['EVENING', '晚班', '13:00:00', '21:00:00', '#fa8c16', 1, '晚间门诊和护理班'],
      ['REST', '休息', '00:00:00', '00:00:00', '#8c8c8c', 1, '休息/不排班'],
    ]
    for (const row of rows) {
      await queryRunner.query(
        `INSERT IGNORE INTO vpet_shift (code, name, startTime, endTime, color, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        row,
      )
    }
  }

  private async seedMenus(queryRunner: QueryRunner) {
    const parentRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', ['/vpet'])
    const parentId = parentRows?.[0]?.id
    if (!parentId)
      return

    const menus = [
      ['/vpet/shift', '班次管理', 'vpet:shift:list', 26, 'vpet/shift/index'],
      ['/vpet/schedule', '排班管理', 'vpet:schedule:list', 27, 'vpet/schedule/index'],
    ]

    for (const [path, name, permission, orderNo, component] of menus) {
      const existingRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [path])
      let menuId = existingRows?.[0]?.id
      if (!menuId) {
        const result = await queryRunner.query(
          `INSERT INTO sys_menu
            (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [parentId, path, name, permission, 1, '', orderNo, component, 0, 1, 1, 0, 1, null],
        )
        menuId = result?.insertId
      }
      if (menuId) {
        await queryRunner.query(`
          INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
          SELECT DISTINCT rm.role_id, ?
          FROM sys_role_menus rm
          INNER JOIN sys_menu m ON m.id = rm.menu_id
          INNER JOIN sys_role r ON r.id = rm.role_id
          WHERE r.status = 1
            AND (m.path IN ('/vpet/doctor', '/vpet/appointment') OR rm.role_id = 1)
        `, [menuId])
      }
    }
  }
}
