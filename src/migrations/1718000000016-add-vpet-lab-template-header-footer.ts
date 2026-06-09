import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddVpetLabTemplateHeaderFooter1718000000016 implements MigrationInterface {
  name = 'AddVpetLabTemplateHeaderFooter1718000000016'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasColumn('vpet_lab_template', 'template_header')) {
      await queryRunner.addColumn('vpet_lab_template', new TableColumn({
        name: 'template_header',
        type: 'text',
        isNullable: true,
      }))
    }
    if (!await queryRunner.hasColumn('vpet_lab_template', 'template_footer')) {
      await queryRunner.addColumn('vpet_lab_template', new TableColumn({
        name: 'template_footer',
        type: 'text',
        isNullable: true,
      }))
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('vpet_lab_template', 'template_footer'))
      await queryRunner.dropColumn('vpet_lab_template', 'template_footer')
    if (await queryRunner.hasColumn('vpet_lab_template', 'template_header'))
      await queryRunner.dropColumn('vpet_lab_template', 'template_header')
  }
}
