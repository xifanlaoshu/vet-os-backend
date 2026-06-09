import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddVpetPrescriptionTemplateFormulas1718000000014 implements MigrationInterface {
  name = 'AddVpetPrescriptionTemplateFormulas1718000000014'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription_template_item', new TableColumn({
      name: 'dosage_formula',
      type: 'varchar',
      length: '300',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_prescription_template_item', new TableColumn({
      name: 'quantity_formula',
      type: 'varchar',
      length: '300',
      isNullable: true,
    }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumnIfExists(queryRunner, 'vpet_prescription_template_item', 'quantity_formula')
    await this.dropColumnIfExists(queryRunner, 'vpet_prescription_template_item', 'dosage_formula')
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    const table = await queryRunner.getTable(tableName)
    if (!table?.findColumnByName(column.name)) {
      await queryRunner.addColumn(tableName, column)
    }
  }

  private async dropColumnIfExists(queryRunner: QueryRunner, tableName: string, columnName: string) {
    const table = await queryRunner.getTable(tableName)
    if (table?.findColumnByName(columnName)) {
      await queryRunner.dropColumn(tableName, columnName)
    }
  }
}
