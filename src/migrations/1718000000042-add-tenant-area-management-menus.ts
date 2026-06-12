import { MigrationInterface, QueryRunner } from 'typeorm'

const menus = [
  {
    path: '/system/tenant',
    name: '租户管理',
    permission: 'system:tenant:list',
    icon: 'ant-design:bank-outlined',
    orderNo: 95,
    component: 'system/tenant/index',
  },
  {
    path: '/system/tenant-area',
    name: '院区管理',
    permission: 'system:tenant:list',
    icon: 'ant-design:shop-outlined',
    orderNo: 96,
    component: 'system/tenant-area/index',
  },
]

export class AddTenantAreaManagementMenus1718000000042 implements MigrationInterface {
  name = 'AddTenantAreaManagementMenus1718000000042'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const parentId = await this.resolveSystemParentId(queryRunner)
    if (!parentId)
      return

    for (const menu of menus) {
      const menuId = await this.upsertMenu(queryRunner, parentId, menu)
      await this.grantMenu(queryRunner, menuId, parentId)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE path IN (?, ?))`,
      menus.map(item => item.path),
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE path IN (?, ?)', menus.map(item => item.path))
  }

  private async resolveSystemParentId(queryRunner: QueryRunner) {
    const candidates = ['/system', '/system/menu', '/system/user']
    for (const path of candidates) {
      const rows = await queryRunner.query('SELECT id, parent_id FROM sys_menu WHERE path = ? LIMIT 1', [path])
      if (rows?.[0]?.id)
        return path === '/system' ? rows[0].id : rows[0].parent_id
    }
  }

  private async upsertMenu(queryRunner: QueryRunner, parentId: number, menu: typeof menus[number]) {
    const existingRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [menu.path])
    const values = [
      parentId,
      menu.path,
      menu.name,
      menu.permission,
      1,
      menu.icon,
      menu.orderNo,
      menu.component,
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
      return existingId
    }
    const result = await queryRunner.query(
      `INSERT INTO sys_menu
        (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values,
    )
    return result?.insertId
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
}
