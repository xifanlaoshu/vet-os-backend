import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddVpetDrugPackageConversion1718000000013 implements MigrationInterface {
  name = 'AddVpetDrugPackageConversion1718000000013'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, 'vpet_drug', new TableColumn({
      name: 'dosage_unit',
      type: 'varchar',
      length: '20',
      isNullable: true,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_drug', new TableColumn({
      name: 'package_content_quantity',
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: 1,
    }))
    await this.addColumnIfMissing(queryRunner, 'vpet_drug', new TableColumn({
      name: 'dosage_unit_price',
      type: 'decimal',
      precision: 8,
      scale: 2,
      isNullable: true,
    }))

    await queryRunner.query(`
      UPDATE vpet_drug
      SET
        dosage_unit = COALESCE(dosage_unit, unit),
        package_content_quantity = CASE
          WHEN package_content_quantity IS NULL OR package_content_quantity <= 0 THEN 1
          ELSE package_content_quantity
        END,
        dosage_unit_price = COALESCE(dosage_unit_price, retail_price)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumnIfExists(queryRunner, 'vpet_drug', 'dosage_unit_price')
    await this.dropColumnIfExists(queryRunner, 'vpet_drug', 'package_content_quantity')
    await this.dropColumnIfExists(queryRunner, 'vpet_drug', 'dosage_unit')
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
