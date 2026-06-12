import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVpetAuditMenu1718000000041 implements MigrationInterface {
  name = 'AddVpetAuditMenu1718000000041'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const parentId = await this.resolveParentId(queryRunner)
    if (!parentId)
      return

    const existingRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', ['/vpet/audit'])
    const values = [
      parentId,
      '/vpet/audit',
      '审计中心',
      'vpet:audit:list',
      1,
      'ant-design:audit-outlined',
      24,
      'vpet/audit/index',
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
      await this.grantMenu(queryRunner, result?.insertId, parentId)
    }

    const menuId = existingId || (await this.getMenuId(queryRunner, '/vpet/audit'))
    await this.grantMenu(queryRunner, menuId, parentId)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sys_role_menus
       WHERE menu_id IN (SELECT id FROM sys_menu WHERE path = ?)`,
      ['/vpet/audit'],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE path = ?', ['/vpet/audit'])
  }

  private async resolveParentId(queryRunner: QueryRunner) {
    return (await this.getMenuId(queryRunner, '/vpet/business-operations'))
      || (await this.getMenuId(queryRunner, '/vpet'))
  }

  private async grantMenu(queryRunner: QueryRunner, menuId: number | undefined, parentId: number) {
    if (!menuId)
      return
    await queryRunner.query('INSERT IGNORE INTO sys_role_menus (role_id, menu_id) VALUES (?, ?)', [1, menuId])
    await queryRunner.query(
      `INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
       SELECT DISTINCT rm.role_id, ?
       FROM sys_role_menus rm
       INNER JOIN sys_role r ON r.id = rm.role_id
       WHERE r.status = 1
         AND rm.menu_id = ?`,
      [menuId, parentId],
    )
  }

  private async getMenuId(queryRunner: QueryRunner, path: string) {
    const rows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [path])
    return rows?.[0]?.id
  }
}
