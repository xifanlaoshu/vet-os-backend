import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * 修复 vpet_drug_batch 中 drug_id 为 NULL 的行
 * 原因: 种子迁移曾使用 drugId(驼峰) 列名, 但实际列名为 drug_id(snake_case),
 *       导致 INSERT 未写入 drug_id, 该字段保持为 NULL
 */
export class FixNullDrugId1717000000002 implements MigrationInterface {
  name = 'FixNullDrugId1717000000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 删除 drug_id 为 NULL 的无效行 (种子数据写错了列名, 整行无用)
    await queryRunner.query(`DELETE FROM vpet_drug_batch WHERE drug_id IS NULL`)
    // 重新插入正确的种子数据
    await queryRunner.query(`
      INSERT INTO vpet_drug_batch (drug_id, batchNo, expireDate, purchasePrice, quantity, initialQuantity) VALUES
        (1, '202505A', '2027-05-01', 18.00, 100, 100),
        (2, '202504B', '2026-12-01', 25.00, 80, 80),
        (9, '202506C', '2027-06-15', 80.00, 30, 30),
        (9, '202501D', '2025-12-31', 78.00, 20, 50),
        (11, '202603E', '2026-09-01', 40.00, 40, 40)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 不做操作
  }
}
