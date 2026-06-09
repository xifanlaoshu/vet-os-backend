import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddVpetLabTemplatePrintConfig1718000000018 implements MigrationInterface {
  name = 'AddVpetLabTemplatePrintConfig1718000000018'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasColumn('vpet_lab_template', 'print_config')) {
      await queryRunner.addColumn('vpet_lab_template', new TableColumn({
        name: 'print_config',
        type: 'json',
        isNullable: true,
      }))
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('vpet_lab_template', 'print_config'))
      await queryRunner.dropColumn('vpet_lab_template', 'print_config')
  }
}
