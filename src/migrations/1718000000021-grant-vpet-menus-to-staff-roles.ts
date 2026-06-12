import { MigrationInterface, QueryRunner } from 'typeorm'

export class GrantVpetMenusToStaffRoles1718000000021 implements MigrationInterface {
  name = 'GrantVpetMenusToStaffRoles1718000000021'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
      SELECT r.id, m.id
      FROM sys_role r
      CROSS JOIN sys_menu m
      WHERE r.id <> 1
        AND r.status = 1
        AND (m.path = '/vpet' OR m.path LIKE '/vpet/%')
    `)
  }

  public async down(): Promise<void> {
    // Keep existing role-menu assignments intact; removing them could discard
    // permissions that were intentionally configured after this migration ran.
  }
}
