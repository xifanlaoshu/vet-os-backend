import { MigrationInterface, QueryRunner } from 'typeorm'

interface MenuSeed {
  path: string
  name: string
  permission: string
  icon: string
  orderNo: number
  component: string
}

interface ActionSeed {
  parentPath: string
  name: string
  permission: string
  orderNo: number
}

const parentMenu = {
  path: '/tenant',
  name: '租户运营',
  permission: 'tenant:profile',
  icon: 'ant-design:apartment-outlined',
  orderNo: 45,
}

const menus: MenuSeed[] = [
  {
    path: '/tenant/user',
    name: '租户用户管理',
    permission: 'tenant:user:list',
    icon: 'ant-design:usergroup-add-outlined',
    orderNo: 1,
    component: 'tenant/user/index',
  },
  {
    path: '/tenant/area',
    name: '租户院区管理',
    permission: 'tenant:area:list',
    icon: 'ant-design:shop-outlined',
    orderNo: 2,
    component: 'tenant/area/index',
  },
]

const actions: ActionSeed[] = [
  { parentPath: '/tenant/user', name: '查询', permission: 'tenant:user:list', orderNo: 0 },
  { parentPath: '/tenant/user', name: '详情', permission: 'tenant:user:read', orderNo: 1 },
  { parentPath: '/tenant/user', name: '新增', permission: 'tenant:user:create', orderNo: 2 },
  { parentPath: '/tenant/user', name: '更新', permission: 'tenant:user:update', orderNo: 3 },
  { parentPath: '/tenant/area', name: '查询', permission: 'tenant:area:list', orderNo: 0 },
  { parentPath: '/tenant/area', name: '新增', permission: 'tenant:area:create', orderNo: 1 },
  { parentPath: '/tenant/area', name: '更新', permission: 'tenant:area:update', orderNo: 2 },
]

export class AddTenantAdminUserAreaMenus1718000000044 implements MigrationInterface {
  name = 'AddTenantAdminUserAreaMenus1718000000044'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const parentId = await this.upsertParentMenu(queryRunner)
    await this.grantToAdmin(queryRunner, parentId)

    for (const menu of menus) {
      const menuId = await this.upsertMenu(queryRunner, parentId, menu)
      await this.grantByParent(queryRunner, parentId, menuId)
    }

    for (const action of actions) {
      const parentMenuId = await this.resolveMenuId(queryRunner, action.parentPath)
      if (!parentMenuId)
        continue
      const actionId = await this.upsertAction(queryRunner, parentMenuId, action)
      await this.grantByParent(queryRunner, parentMenuId, actionId)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE path IN (?, ?) OR permission IN (?))`,
      [menus[0].path, menus[1].path, actions.map(item => item.permission)],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE permission IN (?)', [actions.map(item => item.permission)])
    await queryRunner.query('DELETE FROM sys_menu WHERE path IN (?, ?)', [menus[0].path, menus[1].path])
    await queryRunner.query('DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE path = ?)', [parentMenu.path])
    await queryRunner.query('DELETE FROM sys_menu WHERE path = ?', [parentMenu.path])
  }

  private async upsertParentMenu(queryRunner: QueryRunner) {
    const rows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [parentMenu.path])
    const values = [
      null,
      parentMenu.path,
      parentMenu.name,
      parentMenu.permission,
      0,
      parentMenu.icon,
      parentMenu.orderNo,
      null,
      0,
      1,
      1,
      0,
      1,
      null,
    ]
    const existingId = rows?.[0]?.id
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

  private async upsertMenu(queryRunner: QueryRunner, parentId: number, menu: MenuSeed) {
    const rows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [menu.path])
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
    const existingId = rows?.[0]?.id
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

  private async upsertAction(queryRunner: QueryRunner, parentId: number, action: ActionSeed) {
    const rows = await queryRunner.query(
      'SELECT id FROM sys_menu WHERE parent_id = ? AND permission = ? AND type = 2 LIMIT 1',
      [parentId, action.permission],
    )
    const values = [
      parentId,
      null,
      action.name,
      action.permission,
      2,
      '',
      action.orderNo,
      null,
      0,
      1,
      1,
      0,
      1,
      null,
    ]
    const existingId = rows?.[0]?.id
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

  private async resolveMenuId(queryRunner: QueryRunner, path: string) {
    const rows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [path])
    return rows?.[0]?.id
  }

  private async grantToAdmin(queryRunner: QueryRunner, menuId: number | undefined) {
    if (!menuId)
      return
    await queryRunner.query('INSERT IGNORE INTO sys_role_menus (role_id, menu_id) VALUES (?, ?)', [1, menuId])
  }

  private async grantByParent(queryRunner: QueryRunner, parentId: number, menuId: number | undefined) {
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
