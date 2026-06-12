import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveVpetDashboardMenu1718000000020 implements MigrationInterface {
  name = 'RemoveVpetDashboardMenu1718000000020'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sys_role_menus
       WHERE menu_id IN (SELECT id FROM sys_menu WHERE path = ?)`,
      ['/vpet/dashboard'],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE path = ?', ['/vpet/dashboard'])
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const parentRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', ['/vpet'])
    const parentId = parentRows?.[0]?.id
    if (!parentId)
      return

    const existingRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', ['/vpet/dashboard'])
    if (existingRows?.[0]?.id)
      return

    const result = await queryRunner.query(
      `INSERT INTO sys_menu
        (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parentId, '/vpet/dashboard', '工作台', 'vpet:dashboard', 1, '', 0, 'vpet/dashboard/index', 0, 1, 1, 0, 1, null],
    )
    const menuId = result?.insertId
    if (menuId) {
      await queryRunner.query(
        'INSERT IGNORE INTO sys_role_menus (role_id, menu_id) VALUES (?, ?)',
        [1, menuId],
      )
    }
  }
}
