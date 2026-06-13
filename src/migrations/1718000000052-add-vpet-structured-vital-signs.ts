import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

const vitalColumns = [
  new TableColumn({
    name: 'temperature',
    type: 'decimal',
    precision: 5,
    scale: 1,
    isNullable: true,
    comment: '体温',
  }),
  new TableColumn({
    name: 'heart_rate',
    type: 'int',
    isNullable: true,
    comment: '心率',
  }),
  new TableColumn({
    name: 'respiratory_rate',
    type: 'int',
    isNullable: true,
    comment: '呼吸频率',
  }),
  new TableColumn({
    name: 'body_weight',
    type: 'decimal',
    precision: 6,
    scale: 2,
    isNullable: true,
    comment: '本次体重',
  }),
]

export class AddVpetStructuredVitalSigns1718000000052 implements MigrationInterface {
  name = 'AddVpetStructuredVitalSigns1718000000052'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumns(queryRunner, 'vpet_visit_emr')
    await this.addColumns(queryRunner, 'vpet_visit_care_followup')

    if (await queryRunner.hasTable('vpet_visit_emr')) {
      await queryRunner.query(`
        UPDATE vpet_visit_emr
        SET
          temperature = COALESCE(temperature, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(physical_exam, '$.temperature')), 'null')),
          heart_rate = COALESCE(heart_rate, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(physical_exam, '$.heartRate')), 'null')),
          respiratory_rate = COALESCE(respiratory_rate, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(physical_exam, '$.respiratoryRate')), 'null')),
          body_weight = COALESCE(body_weight, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(physical_exam, '$.weight')), 'null'))
        WHERE physical_exam IS NOT NULL
      `)
    }

    if (await queryRunner.hasTable('vpet_visit_care_followup')) {
      await queryRunner.query(`
        UPDATE vpet_visit_care_followup
        SET
          temperature = COALESCE(temperature, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(vital_signs, '$.temperature')), 'null')),
          heart_rate = COALESCE(heart_rate, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(vital_signs, '$.heartRate')), 'null')),
          respiratory_rate = COALESCE(respiratory_rate, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(vital_signs, '$.respiratoryRate')), 'null')),
          body_weight = COALESCE(body_weight, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(vital_signs, '$.weight')), 'null'))
        WHERE vital_signs IS NOT NULL
      `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropColumns(queryRunner, 'vpet_visit_care_followup')
    await this.dropColumns(queryRunner, 'vpet_visit_emr')
  }

  private async addColumns(queryRunner: QueryRunner, tableName: string) {
    if (!(await queryRunner.hasTable(tableName)))
      return
    for (const column of vitalColumns) {
      if (!(await queryRunner.hasColumn(tableName, column.name)))
        await queryRunner.addColumn(tableName, column.clone())
    }
  }

  private async dropColumns(queryRunner: QueryRunner, tableName: string) {
    if (!(await queryRunner.hasTable(tableName)))
      return
    for (const column of vitalColumns.slice().reverse()) {
      if (await queryRunner.hasColumn(tableName, column.name))
        await queryRunner.dropColumn(tableName, column.name)
    }
  }
}
