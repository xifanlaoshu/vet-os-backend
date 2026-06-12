import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVpetVisitPrintMenu1718000000030 implements MigrationInterface {
  name = 'AddVpetVisitPrintMenu1718000000030'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const parentRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', ['/vpet'])
    const parentId = parentRows?.[0]?.id
    if (!parentId)
      return

    const existingRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', ['/vpet/consultation/visit/:id/print'])
    let menuId = existingRows?.[0]?.id

    if (!menuId) {
      const result = await queryRunner.query(
        `INSERT INTO sys_menu
          (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parentId,
          '/vpet/consultation/visit/:id/print',
          '病历打印',
          'vpet:consultation',
          1,
          '',
          7,
          'vpet/consultation/print',
          0,
          0,
          1,
          0,
          1,
          '/vpet/consultation',
        ],
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
          AND (m.path = '/vpet/consultation' OR rm.role_id = 1)
      `, [menuId])
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sys_role_menus
       WHERE menu_id IN (SELECT id FROM sys_menu WHERE path = ?)`,
      ['/vpet/consultation/visit/:id/print'],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE path = ?', ['/vpet/consultation/visit/:id/print'])
  }
}
