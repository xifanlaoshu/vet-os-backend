import { MigrationInterface, QueryRunner } from 'typeorm'

export class TightenVpetVisitPrintMenuPermission1718000000031 implements MigrationInterface {
  name = 'TightenVpetVisitPrintMenuPermission1718000000031'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const printRows = await queryRunner.query('SELECT id FROM sys_menu WHERE path = ? LIMIT 1', ['/vpet/consultation/visit/:id/print'])
    const printMenuId = printRows?.[0]?.id
    if (!printMenuId)
      return

    await queryRunner.query(
      'UPDATE sys_menu SET permission = ? WHERE id = ?',
      ['vpet:consultation', printMenuId],
    )

    await queryRunner.query(`
      DELETE FROM sys_role_menus
      WHERE menu_id = ?
        AND role_id NOT IN (
          SELECT role_id
          FROM (
            SELECT DISTINCT rm.role_id
            FROM sys_role_menus rm
            INNER JOIN sys_menu m ON m.id = rm.menu_id
            WHERE m.path = '/vpet/consultation'
               OR rm.role_id = 1
          ) allowed_roles
        )
    `, [printMenuId])
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE sys_menu SET permission = NULL WHERE path = ?',
      ['/vpet/consultation/visit/:id/print'],
    )
  }
}
