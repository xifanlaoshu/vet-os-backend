import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 修复: 种子数据使用 drugId(驼峰) 插入导致 drug_id 列为 NULL
 * 将旧 drugId 列数据迁移到 drug_id, 然后删除旧列
 */
export class FixDrugBatchColumn1717000000001 implements MigrationInterface {
  name = 'FixDrugBatchColumn1717000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 检查是否存在旧列 drugId, 将数据迁至 drug_id
    const hasOldCol = await queryRunner.hasColumn('vpet_drug_batch', 'drugId')
    if (hasOldCol) {
      await queryRunner.query(`
        UPDATE vpet_drug_batch SET drug_id = drugId WHERE drug_id IS NULL AND drugId IS NOT NULL
      `)
      // 2. 删除旧列
      await queryRunner.query(`ALTER TABLE vpet_drug_batch DROP COLUMN drugId`)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚: 不做操作，仅标记迁移
  }
}
