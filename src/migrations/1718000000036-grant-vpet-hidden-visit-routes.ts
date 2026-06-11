import { MigrationInterface, QueryRunner } from 'typeorm'

const SOURCE_PATHS = [
  '/vpet/consultation',
  '/vpet/visit-history',
]

const TARGET_PATHS = [
  '/vpet',
  '/vpet/business-operations',
  '/vpet/consultation',
  '/vpet/consultation/visit/:id',
  '/vpet/consultation/visit/:id/print',
  '/vpet/visit-history',
]

export class GrantVpetHiddenVisitRoutes1718000000036 implements MigrationInterface {
  name = 'GrantVpetHiddenVisitRoutes1718000000036'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.grantRoutesToConsultationRoles(queryRunner)
    await this.grantRoutesToAdminRole(queryRunner)
  }

  public async down(): Promise<void> {
    // Intentionally keep granted role-menu relations. Removing them could revoke
    // permissions that were later assigned manually in menu management.
  }

  private async grantRoutesToConsultationRoles(queryRunner: QueryRunner) {
    await queryRunner.query(
      `INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
       SELECT DISTINCT source_role.role_id, target_menu.id
       FROM sys_role_menus source_role
       INNER JOIN sys_menu source_menu ON source_menu.id = source_role.menu_id
       CROSS JOIN sys_menu target_menu
       WHERE source_menu.path IN (${this.placeholders(SOURCE_PATHS)})
         AND target_menu.path IN (${this.placeholders(TARGET_PATHS)})`,
      [...SOURCE_PATHS, ...TARGET_PATHS],
    )
  }

  private async grantRoutesToAdminRole(queryRunner: QueryRunner) {
    await queryRunner.query(
      `INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
       SELECT 1, id
       FROM sys_menu
       WHERE path IN (${this.placeholders(TARGET_PATHS)})`,
      TARGET_PATHS,
    )
  }

  private placeholders(values: unknown[]) {
    return values.map(() => '?').join(', ')
  }
}
