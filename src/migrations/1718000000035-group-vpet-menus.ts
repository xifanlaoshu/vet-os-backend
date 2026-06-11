import { MigrationInterface, QueryRunner } from 'typeorm'

interface MenuGroup {
  path: string
  name: string
  orderNo: number
  icon: string
}

const VPET_ROOT_PATH = '/vpet'

const BASIC_GROUP: MenuGroup = {
  path: '/vpet/basic-settings',
  name: '基础设置',
  orderNo: 1,
  icon: 'ant-design:setting-outlined',
}

const BUSINESS_GROUP: MenuGroup = {
  path: '/vpet/business-operations',
  name: '业务操作',
  orderNo: 2,
  icon: 'ant-design:appstore-outlined',
}

const basicPaths = [
  '/vpet/doctor',
  '/vpet/pharmacy',
  '/vpet/service-item',
  '/vpet/consent',
  '/vpet/shift',
  '/vpet/schedule',
]

const businessPaths = [
  '/vpet/customer',
  '/vpet/customer/:id',
  '/vpet/pet',
  '/vpet/pet/:id',
  '/vpet/consultation',
  '/vpet/consultation/visit/:id',
  '/vpet/consultation/visit/:id/print',
  '/vpet/visit-history',
  '/vpet/appointment',
  '/vpet/chronic',
  '/vpet/lab/list',
  '/vpet/lab/report/:id',
  '/vpet/prescription',
  '/vpet/billing',
  '/vpet/member',
  '/vpet/hosp/list',
  '/vpet/hosp/nursing/:id',
  '/vpet/reminder/list',
  '/vpet/report/daily',
  '/vpet/insurance/list',
  '/vpet/store',
  '/vpet/ai',
  '/vpet/queue',
]

export class GroupVpetMenus1718000000035 implements MigrationInterface {
  name = 'GroupVpetMenus1718000000035'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rootId = await this.getMenuId(queryRunner, VPET_ROOT_PATH)
    if (!rootId)
      return

    const basicId = await this.ensureGroup(queryRunner, rootId, BASIC_GROUP)
    const businessId = await this.ensureGroup(queryRunner, rootId, BUSINESS_GROUP)

    await this.moveMenus(queryRunner, basicId, basicPaths)
    await this.moveMenus(queryRunner, businessId, businessPaths)
    await this.grantGroupPermissions(queryRunner, [basicId, businessId])
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rootId = await this.getMenuId(queryRunner, VPET_ROOT_PATH)
    if (!rootId)
      return

    await this.moveMenus(queryRunner, rootId, [...basicPaths, ...businessPaths])
    await queryRunner.query(
      `DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE path IN (?, ?))`,
      [BASIC_GROUP.path, BUSINESS_GROUP.path],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE path IN (?, ?)', [BASIC_GROUP.path, BUSINESS_GROUP.path])
  }

  private async ensureGroup(queryRunner: QueryRunner, rootId: number, group: MenuGroup) {
    const existingId = await this.getMenuId(queryRunner, group.path)
    if (existingId) {
      await queryRunner.query(
        `UPDATE sys_menu
         SET parent_id = ?, name = ?, type = 0, icon = ?, order_no = ?, component = '',
             keep_alive = 0, \`show\` = 1, status = 1, is_ext = 0, ext_open_mode = 1, active_menu = NULL
         WHERE id = ?`,
        [rootId, group.name, group.icon, group.orderNo, existingId],
      )
      return existingId
    }

    const result = await queryRunner.query(
      `INSERT INTO sys_menu
        (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
       VALUES (?, ?, ?, NULL, 0, ?, ?, '', 0, 1, 1, 0, 1, NULL)`,
      [rootId, group.path, group.name, group.icon, group.orderNo],
    )
    return result?.insertId
  }

  private async moveMenus(queryRunner: QueryRunner, parentId: number, paths: string[]) {
    for (let index = 0; index < paths.length; index++) {
      await queryRunner.query(
        'UPDATE sys_menu SET parent_id = ?, order_no = ? WHERE path = ?',
        [parentId, index + 1, paths[index]],
      )
    }
  }

  private async grantGroupPermissions(queryRunner: QueryRunner, groupIds: number[]) {
    for (const groupId of groupIds) {
      await queryRunner.query(
        `INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
         SELECT DISTINCT rm.role_id, ?
         FROM sys_role_menus rm
         INNER JOIN sys_menu m ON m.id = rm.menu_id
         INNER JOIN sys_role r ON r.id = rm.role_id
         WHERE r.status = 1
           AND (m.path LIKE '/vpet/%' OR rm.role_id = 1)`,
        [groupId],
      )
    }
  }

  private async getMenuId(queryRunner: QueryRunner, path: string) {
    const rows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', [path])
    return rows?.[0]?.id
  }
}
