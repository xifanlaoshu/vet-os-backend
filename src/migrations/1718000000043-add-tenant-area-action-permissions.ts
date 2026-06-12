import { MigrationInterface, QueryRunner } from 'typeorm'

interface ActionPermission {
  parentPath: string
  name: string
  permission: string
  orderNo: number
}

const actions: ActionPermission[] = [
  { parentPath: '/system/tenant', name: '新增', permission: 'system:tenant:create', orderNo: 1 },
  { parentPath: '/system/tenant', name: '更新', permission: 'system:tenant:update', orderNo: 2 },
  { parentPath: '/system/tenant-area', name: '查询', permission: 'system:tenant:area:list', orderNo: 0 },
  { parentPath: '/system/tenant-area', name: '新增', permission: 'system:tenant:area:create', orderNo: 1 },
  { parentPath: '/system/tenant-area', name: '更新', permission: 'system:tenant:area:update', orderNo: 2 },
]

export class AddTenantAreaActionPermissions1718000000043 implements MigrationInterface {
  name = 'AddTenantAreaActionPermissions1718000000043'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE sys_menu SET permission = ? WHERE path = ?',
      ['system:tenant:area:list', '/system/tenant-area'],
    )

    for (const action of actions) {
      const parentId = await this.resolveParentId(queryRunner, action.parentPath)
      if (!parentId)
        continue

      const actionId = await this.upsertAction(queryRunner, parentId, action)
      await this.grantAction(queryRunner, parentId, actionId)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE sys_menu SET permission = ? WHERE path = ?',
      ['system:tenant:list', '/system/tenant-area'],
    )

    await queryRunner.query(
      `DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE permission IN (?))`,
      [actions.map(item => item.permission)],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE permission IN (?)', [
      actions.map(item => item.permission),
    ])
  }

  private async resolveParentId(queryRunner: QueryRunner, parentPath: string) {
    const rows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [parentPath])
    return rows?.[0]?.id
  }

  private async upsertAction(queryRunner: QueryRunner, parentId: number, action: ActionPermission) {
    const rows = await queryRunner.query('SELECT id FROM sys_menu WHERE permission = ? LIMIT 1', [action.permission])
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

  private async grantAction(queryRunner: QueryRunner, parentId: number, actionId: number | undefined) {
    if (!actionId)
      return
    await queryRunner.query('INSERT IGNORE INTO sys_role_menus (role_id, menu_id) VALUES (?, ?)', [1, actionId])
    await queryRunner.query(
      `INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
       SELECT DISTINCT rm.role_id, ?
       FROM sys_role_menus rm
       INNER JOIN sys_role r ON r.id = rm.role_id
       WHERE r.status = 1
         AND rm.menu_id = ?`,
      [actionId, parentId],
    )
  }
}
