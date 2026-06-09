import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedDoctorsVisitType1717000000005 implements MigrationInterface {
  name = 'SeedDoctorsVisitType1717000000005'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO vpet_doctor (userId, name, title, department, status) VALUES
        (1, '张医生', '主治医师', '内科', 1),
        (2, '李医生', '副主任医师', '外科', 1),
        (3, '王医生', '主治医师', '皮肤科', 1)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM vpet_doctor')
  }
}
