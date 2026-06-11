import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVpetDoctorBookable1718000000032 implements MigrationInterface {
  name = 'AddVpetDoctorBookable1718000000032'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_doctor')
    if (!table)
      return
    if (!table.findColumnByName('bookable')) {
      await queryRunner.query('ALTER TABLE vpet_doctor ADD COLUMN bookable tinyint NOT NULL DEFAULT 1')
    }
    await queryRunner.query('UPDATE vpet_doctor SET bookable = 1 WHERE bookable IS NULL')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_doctor')
    if (!table?.findColumnByName('bookable'))
      return
    await queryRunner.query('ALTER TABLE vpet_doctor DROP COLUMN bookable')
  }
}
