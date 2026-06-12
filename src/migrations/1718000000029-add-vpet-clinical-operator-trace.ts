import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVpetClinicalOperatorTrace1718000000029 implements MigrationInterface {
  name = 'AddVpetClinicalOperatorTrace1718000000029'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureRecordedBy(queryRunner, 'vpet_visit_diagnosis')
    await this.ensureRecordedBy(queryRunner, 'vpet_visit_progress_batch')
    await this.ensureRecordedBy(queryRunner, 'vpet_visit_plan_batch')
    await this.ensureRecordedBy(queryRunner, 'vpet_visit_care_followup')

    await this.backfillFromVisitDoctor(queryRunner, 'vpet_visit_diagnosis')
    await this.backfillFromVisitDoctor(queryRunner, 'vpet_visit_progress_batch')
    await this.backfillFromVisitDoctor(queryRunner, 'vpet_visit_plan_batch')
    await this.backfillFromVisitDoctor(queryRunner, 'vpet_visit_care_followup')
  }

  public async down(): Promise<void> {
    // 留痕字段不自动回滚，避免误删已产生的医护人员追溯信息。
  }

  private async ensureRecordedBy(queryRunner: QueryRunner, tableName: string) {
    const table = await queryRunner.getTable(tableName)
    if (!table)
      return
    if (table.findColumnByName('recorded_by'))
      return
    await queryRunner.query(`ALTER TABLE ${tableName} ADD COLUMN recorded_by int NULL`)
    await queryRunner.query(`CREATE INDEX idx_${tableName}_recorded_by ON ${tableName} (recorded_by)`)
  }

  private async backfillFromVisitDoctor(queryRunner: QueryRunner, tableName: string) {
    await queryRunner.query(
      `UPDATE ${tableName} target
       INNER JOIN vpet_visit visit ON visit.id = target.visit_id
       SET target.recorded_by = visit.doctor_id
       WHERE target.recorded_by IS NULL
         AND visit.doctor_id IS NOT NULL`,
    )
  }
}
