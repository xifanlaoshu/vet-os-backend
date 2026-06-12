import { MigrationInterface, QueryRunner } from 'typeorm'

interface MenuSeed {
  path: string | null
  name: string
  parentPath?: string
  permission?: string | null
  type: 0 | 1 | 2
  icon?: string | null
  orderNo?: number
  component?: string | null
  keepAlive?: 0 | 1
  show?: 0 | 1
  status?: 0 | 1
  isExt?: 0 | 1
  extOpenMode?: 1 | 2
  activeMenu?: string | null
}

const ROOT_ROLE_ID = 1

const dashboardMenus: MenuSeed[] = [
  { path: '/dashboard', name: '仪表盘', type: 0, icon: 'ant-design:dashboard-outlined', orderNo: 0, component: '', keepAlive: 0 },
  { path: '/dashboard/welcome', parentPath: '/dashboard', name: '工作台', type: 1, icon: 'ant-design:home-filled', orderNo: 0, component: 'dashboard/welcome/index', keepAlive: 0 },
]

const demoMenus: MenuSeed[] = [
  { path: '/demos', name: 'demo演示', type: 0, icon: 'ant-design:desktop-outlined', orderNo: 3, component: '', keepAlive: 0 },
  { path: '/demos/custom-modal', parentPath: '/demos', name: '弹窗组件', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 0, component: 'demos/custom-modal', keepAlive: 0 },
  { path: '/demos/button', parentPath: '/demos', name: '按钮组件', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 1, component: 'demos/button', keepAlive: 0 },
  { path: '/demos/form', parentPath: '/demos', name: '表单组件', type: 0, icon: 'ant-design:desktop-outlined', orderNo: 2, component: '', keepAlive: 0 },
  { path: '/demos/form/basic', parentPath: '/demos/form', name: '基础表单', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 0, component: 'demos/form/basic-form/index', keepAlive: 0 },
  { path: '/demos/form/rule', parentPath: '/demos/form', name: '规则表单', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 1, component: 'demos/form/rule-form/index', keepAlive: 0 },
  { path: '/demos/form/dynamic', parentPath: '/demos/form', name: '动态表单', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 2, component: 'demos/form/dynamic-form/index', keepAlive: 0 },
  { path: '/demos/form/useForm', parentPath: '/demos/form', name: 'useForm', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 3, component: 'demos/form/use-form/index', keepAlive: 0 },
  { path: '/demos/form/custom-form', parentPath: '/demos/form', name: '自定义表单', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 4, component: 'demos/form/custom-form/index', keepAlive: 0 },
  { path: '/demos/form/request-form', parentPath: '/demos/form', name: '自定义请求表单', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 5, component: 'demos/form/request-form/index', keepAlive: 0 },
  { path: '/demos/table', parentPath: '/demos', name: '表格组件', type: 0, icon: 'ant-design:desktop-outlined', orderNo: 3, component: '', keepAlive: 0 },
  { path: '/demos/table/search-table', parentPath: '/demos/table', name: '查询表格', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 0, component: 'demos/tables/search-table/index', keepAlive: 0 },
  { path: '/demos/table/edit-row-table', parentPath: '/demos/table', name: '可编辑行表格', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 1, component: 'demos/tables/edit-row-table/index', keepAlive: 0 },
  { path: '/demos/table/wzry', parentPath: '/demos/table', name: '王者荣耀表格', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 2, component: 'demos/tables/wzry-table/index', keepAlive: 0 },
  { path: '/demos/table/lol', parentPath: '/demos/table', name: '英雄联盟表格', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 3, component: 'demos/tables/lol-table/index', keepAlive: 0 },
  { path: '/demos/table/lol/:id', parentPath: '/demos/table', name: '英雄详情', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 4, component: 'demos/tables/lol-table/heroInfo', keepAlive: 0, show: 0, activeMenu: '/demos/table/lol' },
  { path: '/demos/nested-routes', parentPath: '/demos', name: '嵌套路由', type: 0, icon: 'ant-design:desktop-outlined', orderNo: 4, component: 'demos/nested-routes/index', keepAlive: 1 },
  { path: '/demos/nested-routes/route-one', parentPath: '/demos/nested-routes', name: '路由一', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 0, component: 'demos/nested-routes/route-one', keepAlive: 1 },
  { path: '/demos/nested-routes/route-two', parentPath: '/demos/nested-routes', name: '路由二', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 1, component: 'demos/nested-routes/route-two', keepAlive: 1 },
  { path: '/demos/nested-routes/route-three', parentPath: '/demos/nested-routes', name: '路由三', type: 1, icon: 'ant-design:desktop-outlined', orderNo: 2, component: 'demos/nested-routes/route-three', keepAlive: 1 },
]

const externalMenus: MenuSeed[] = [
  { path: 'https://github.com/buqiyuan/nest-admin', name: '后台代码仓库', type: 1, icon: 'ant-design:link-outlined', orderNo: 4, component: null, keepAlive: 0, isExt: 1, extOpenMode: 1 },
]

const vpetMenus: MenuSeed[] = [
  { path: '/vpet', name: '宠物医疗', type: 0, icon: 'ant-design:medicine-box-outlined', orderNo: 1, component: '', keepAlive: 0 },
  { path: '/vpet/customer', parentPath: '/vpet', name: '客户管理', permission: 'vpet:customer:list', type: 1, orderNo: 1, component: 'vpet/customer/list', keepAlive: 0 },
  { path: '/vpet/customer/:id', parentPath: '/vpet', name: '客户详情', type: 1, orderNo: 2, component: 'vpet/customer/detail', keepAlive: 0, show: 0, activeMenu: '/vpet/customer' },
  { path: '/vpet/pet', parentPath: '/vpet', name: '宠物管理', permission: 'vpet:pet:list', type: 1, orderNo: 3, component: 'vpet/pet/list', keepAlive: 0 },
  { path: '/vpet/pet/:id', parentPath: '/vpet', name: '宠物详情', type: 1, orderNo: 4, component: 'vpet/pet/detail', keepAlive: 0, show: 0, activeMenu: '/vpet/pet' },
  { path: '/vpet/consultation', parentPath: '/vpet', name: '门诊工作台', permission: 'vpet:consultation', type: 1, orderNo: 5, component: 'vpet/consultation/index', keepAlive: 0 },
  { path: '/vpet/consultation/visit/:id', parentPath: '/vpet', name: '就诊病历', type: 1, orderNo: 6, component: 'vpet/consultation/detail', keepAlive: 0, show: 0, activeMenu: '/vpet/consultation' },
  { path: '/vpet/visit-history', parentPath: '/vpet', name: '历史就诊记录', permission: 'vpet:consultation', type: 1, orderNo: 7, component: 'vpet/visit-history/index', keepAlive: 0 },
  { path: '/vpet/appointment', parentPath: '/vpet', name: '预约挂号', permission: 'vpet:appointment', type: 1, orderNo: 8, component: 'vpet/appointment/index', keepAlive: 0 },
  { path: '/vpet/chronic', parentPath: '/vpet', name: '慢病管理', permission: 'vpet:chronic:list', type: 1, orderNo: 9, component: 'vpet/chronic/index', keepAlive: 0 },
  { path: '/vpet/lab/list', parentPath: '/vpet', name: '化验检查', permission: 'vpet:lab:list', type: 1, orderNo: 10, component: 'vpet/lab/list', keepAlive: 0 },
  { path: '/vpet/lab/report/:id', parentPath: '/vpet', name: '化验报告', type: 1, orderNo: 11, component: 'vpet/lab/report', keepAlive: 0, show: 0, activeMenu: '/vpet/lab/list' },
  { path: '/vpet/prescription', parentPath: '/vpet', name: '处方管理', permission: 'vpet:prescription:list', type: 1, orderNo: 12, component: 'vpet/prescription/index', keepAlive: 0 },
  { path: '/vpet/billing', parentPath: '/vpet', name: '收费结算', permission: 'vpet:billing:list', type: 1, orderNo: 13, component: 'vpet/billing/index', keepAlive: 0 },
  { path: '/vpet/member', parentPath: '/vpet', name: '会员管理', permission: 'vpet:member:list', type: 1, orderNo: 14, component: 'vpet/member/index', keepAlive: 0 },
  { path: '/vpet/pharmacy', parentPath: '/vpet', name: '药房管理', permission: 'vpet:pharmacy:list', type: 1, orderNo: 15, component: 'vpet/pharmacy/index', keepAlive: 0 },
  { path: '/vpet/service-item', parentPath: '/vpet', name: '服务项目', permission: 'vpet:service-item:list', type: 1, orderNo: 16, component: 'vpet/service-item/index', keepAlive: 0 },
  { path: '/vpet/hosp/list', parentPath: '/vpet', name: '住院管理', permission: 'vpet:hosp:list', type: 1, orderNo: 17, component: 'vpet/hosp/list', keepAlive: 0 },
  { path: '/vpet/hosp/nursing/:id', parentPath: '/vpet', name: '护理执行', type: 1, orderNo: 18, component: 'vpet/hosp/nursing', keepAlive: 0, show: 0, activeMenu: '/vpet/hosp/list' },
  { path: '/vpet/reminder/list', parentPath: '/vpet', name: '提醒随访', permission: 'vpet:reminder:list', type: 1, orderNo: 19, component: 'vpet/reminder/list', keepAlive: 0 },
  { path: '/vpet/report/daily', parentPath: '/vpet', name: '经营日报', permission: 'vpet:report:daily', type: 1, orderNo: 20, component: 'vpet/report/daily', keepAlive: 0 },
  { path: '/vpet/insurance/list', parentPath: '/vpet', name: '保险理赔', permission: 'vpet:insurance:list', type: 1, orderNo: 21, component: 'vpet/insurance/list', keepAlive: 0 },
  { path: '/vpet/store', parentPath: '/vpet', name: '门店调拨', permission: 'vpet:store:list', type: 1, orderNo: 22, component: 'vpet/store/index', keepAlive: 0 },
  { path: '/vpet/ai', parentPath: '/vpet', name: 'AI 辅助', permission: 'vpet:ai', type: 1, orderNo: 23, component: 'vpet/ai/index', keepAlive: 0 },
  { path: '/vpet/doctor', parentPath: '/vpet', name: '医护人员', permission: 'vpet:doctor:list', type: 1, orderNo: 24, component: 'vpet/doctor/index', keepAlive: 0 },
  { path: '/vpet/queue', parentPath: '/vpet', name: '叫号大屏', permission: 'vpet:queue:list', type: 1, orderNo: 25, component: 'vpet/queue/board', keepAlive: 0 },
]

const allMenus = [
  ...dashboardMenus,
  ...vpetMenus,
  ...demoMenus,
  ...externalMenus,
]

export class SeedFrontendStaticMenus1718000000019 implements MigrationInterface {
  name = 'SeedFrontendStaticMenus1718000000019'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const pathIdMap = new Map<string, number>()

    for (const menu of allMenus) {
      const parentId = menu.parentPath ? pathIdMap.get(menu.parentPath) : null
      if (menu.parentPath && !parentId)
        throw new Error(`Parent menu not found for ${menu.path}: ${menu.parentPath}`)

      const existingRows = await queryRunner.query(
        'SELECT id FROM sys_menu WHERE path <=> ? AND type = ? LIMIT 1',
        [menu.path, menu.type],
      )
      const existingId = existingRows?.[0]?.id
      const values = [
        parentId,
        menu.path,
        menu.name,
        menu.permission ?? null,
        menu.type,
        menu.icon ?? '',
        menu.orderNo ?? 0,
        menu.component ?? null,
        menu.keepAlive ?? 0,
        menu.show ?? 1,
        menu.status ?? 1,
        menu.isExt ?? 0,
        menu.extOpenMode ?? 1,
        menu.activeMenu ?? null,
      ]

      if (existingId) {
        await queryRunner.query(
          `UPDATE sys_menu
           SET parent_id = ?, path = ?, name = ?, permission = ?, type = ?, icon = ?, order_no = ?,
               component = ?, keep_alive = ?, \`show\` = ?, status = ?, is_ext = ?, ext_open_mode = ?, active_menu = ?
           WHERE id = ?`,
          [...values, existingId],
        )
        pathIdMap.set(menu.path!, existingId)
        await this.ensureRootRoleMenu(queryRunner, existingId)
        continue
      }

      const result = await queryRunner.query(
        `INSERT INTO sys_menu
          (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values,
      )
      const id = result?.insertId
      pathIdMap.set(menu.path!, id)
      await this.ensureRootRoleMenu(queryRunner, id)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const paths = allMenus.map(menu => menu.path).filter(Boolean)
    if (!paths.length)
      return
    const placeholders = paths.map(() => '?').join(',')
    await queryRunner.query(
      `DELETE FROM sys_role_menus WHERE menu_id IN (SELECT id FROM sys_menu WHERE path IN (${placeholders}))`,
      paths,
    )
    await queryRunner.query(`DELETE FROM sys_menu WHERE path IN (${placeholders})`, paths)
  }

  private async ensureRootRoleMenu(queryRunner: QueryRunner, menuId: number): Promise<void> {
    await queryRunner.query(
      'INSERT IGNORE INTO sys_role_menus (role_id, menu_id) VALUES (?, ?)',
      [ROOT_ROLE_ID, menuId],
    )
  }
}
