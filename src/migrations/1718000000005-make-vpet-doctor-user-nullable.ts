import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class MakeVpetDoctorUserNullable1718000000005 implements MigrationInterface {
  name = 'MakeVpetDoctorUserNullable1718000000005'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_doctor')
    const userIdColumn = table?.findColumnByName('userId')
    if (!userIdColumn || userIdColumn.isNullable)
      return

    await queryRunner.changeColumn(
      'vpet_doctor',
      'userId',
      new TableColumn({
        ...userIdColumn,
        isNullable: true,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vpet_doctor')
    const userIdColumn = table?.findColumnByName('userId')
    if (!userIdColumn || !userIdColumn.isNullable)
      return

    await queryRunner.changeColumn(
      'vpet_doctor',
      'userId',
      new TableColumn({
        ...userIdColumn,
        isNullable: false,
      }),
    )
  }
}
