import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedDrugs1707996690002 implements MigrationInterface {
  name = 'SeedDrugs1707996690002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 药品主数据
    await queryRunner.query(`
      INSERT INTO vpet_drug (drug_code, drug_name, specification, unit, retail_price, min_stock, category, drug_type) VALUES
        ('DRG001', '奥美拉唑肠溶片', '20mg*14片', '盒', 25.00, 20, 1, 1),
        ('DRG002', '阿莫西林克拉维酸钾', '250mg*10片', '盒', 35.00, 15, 1, 1),
        ('DRG003', '多西环素片', '100mg*10片', '盒', 28.00, 10, 1, 1),
        ('DRG004', '马罗匹坦(Cerenia)', '16mg*4片', '盒', 120.00, 5, 1, 1),
        ('DRG005', '益生菌粉(犬猫通用)', '5g*10包', '盒', 45.00, 10, 2, 2),
        ('DRG006', '伊曲康唑胶囊', '100mg*14粒', '盒', 68.00, 10, 1, 1),
        ('DRG007', '大宠爱(塞拉菌素滴剂)-猫', '0.75ml*3支', '盒', 180.00, 10, 5, 2),
        ('DRG008', '大宠爱(塞拉菌素滴剂)-犬', '0.75ml*3支', '盒', 200.00, 10, 5, 2),
        ('DRG009', '猫三联疫苗(妙三多)', '1支/盒', '支', 120.00, 20, 4, 2),
        ('DRG010', '犬六联疫苗(卫佳捌)', '1支/盒', '支', 100.00, 15, 4, 2),
        ('DRG011', '狂犬疫苗', '1支/盒', '支', 60.00, 15, 4, 2),
        ('DRG012', '0.9%氯化钠注射液', '250ml/袋', '袋', 8.00, 50, 1, 1),
        ('DRG013', '5%葡萄糖注射液', '250ml/袋', '袋', 8.00, 50, 1, 1),
        ('DRG014', '乳酸林格氏液', '500ml/袋', '袋', 12.00, 30, 1, 1),
        ('DRG015', '头孢噻肟钠注射液', '1g/支', '支', 25.00, 20, 1, 1),
        ('DRG016', '布托啡诺注射液', '10ml:100mg', '支', 65.00, 5, 1, 3),
        ('DRG017', '异氟烷(麻醉剂)', '100ml/瓶', '瓶', 280.00, 3, 1, 3)
    `)

    // 批次库存数据（同一药品可能有多批次）
    await queryRunner.query(`
      INSERT INTO vpet_drug_batch (drug_id, batch_no, expire_date, purchase_price, quantity, initial_quantity) VALUES
        (1, '202505A', '2027-05-01', 18.00, 100, 100),
        (2, '202504B', '2026-12-01', 25.00, 80, 80),
        (9, '202506C', '2027-06-15', 80.00, 30, 30),
        (9, '202501D', '2025-12-31', 78.00, 20, 50),
        (11, '202603E', '2026-09-01', 40.00, 40, 40)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM vpet_drug_batch')
    await queryRunner.query('DELETE FROM vpet_drug')
  }
}
