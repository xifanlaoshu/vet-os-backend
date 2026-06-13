import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddUserMfa1718000000051 implements MigrationInterface {
  name = 'AddUserMfa1718000000051'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('sys_user')))
      return

    if (!(await queryRunner.hasColumn('sys_user', 'mfa_enabled'))) {
      await queryRunner.addColumn('sys_user', new TableColumn({
        name: 'mfa_enabled',
        type: 'tinyint',
        default: 0,
      }))
    }

    if (!(await queryRunner.hasColumn('sys_user', 'mfa_secret'))) {
      await queryRunner.addColumn('sys_user', new TableColumn({
        name: 'mfa_secret',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }))
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('sys_user')))
      return

    if (await queryRunner.hasColumn('sys_user', 'mfa_secret'))
      await queryRunner.dropColumn('sys_user', 'mfa_secret')

    if (await queryRunner.hasColumn('sys_user', 'mfa_enabled'))
      await queryRunner.dropColumn('sys_user', 'mfa_enabled')
  }
}
