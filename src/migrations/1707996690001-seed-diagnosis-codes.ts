import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedDiagnosisCodes1707996690001 implements MigrationInterface {
  name = 'SeedDiagnosisCodes1707996690001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO vpet_diagnosis_code (code, name, category, speciesScope) VALUES
        ('A01', '犬细小病毒感染', '传染病', 'dog'),
        ('A02', '猫泛白细胞减少症(猫瘟)', '传染病', 'cat'),
        ('A03', '犬瘟热', '传染病', 'dog'),
        ('A04', '猫杯状病毒感染', '传染病', 'cat'),
        ('A05', '猫鼻支(FHV-1)', '传染病', 'cat'),
        ('B01', '细菌性皮肤病', '皮肤科', 'all'),
        ('B02', '真菌性皮肤病(猫癣)', '皮肤科', 'all'),
        ('B03', '疥螨感染', '皮肤科', 'all'),
        ('B04', '蠕形螨病', '皮肤科', 'dog'),
        ('C01', '急性胃肠炎', '消化内科', 'all'),
        ('C02', '胰腺炎', '消化内科', 'all'),
        ('C03', '炎性肠病(IBD)', '消化内科', 'all'),
        ('D01', '慢性肾病(CKD)', '泌尿内科', 'all'),
        ('D02', '尿石症', '泌尿外科', 'all'),
        ('D03', '猫下泌尿道疾病(FIC)', '泌尿外科', 'cat'),
        ('E01', '骨折', '骨科', 'all'),
        ('E02', '髌骨脱位', '骨科', 'dog'),
        ('E03', '髋关节发育不良', '骨科', 'dog'),
        ('F01', '子宫蓄脓', '生殖外科', 'all'),
        ('G01', '中耳炎', '耳科', 'all'),
        ('H01', '牙龈炎/牙结石', '牙科', 'all'),
        ('I01', '糖尿病(DM)', '内分泌', 'all'),
        ('I02', '甲状腺功能减退', '内分泌', 'dog'),
        ('I03', '甲状腺功能亢进', '内分泌', 'cat'),
        ('J01', '猫传染性腹膜炎(FIP)', '传染病', 'cat'),
        ('J02', '犬窝咳', '呼吸内科', 'dog'),
        ('J03', '猫哮喘', '呼吸内科', 'cat'),
        ('K01', '特应性皮炎', '皮肤科', 'all'),
        ('L01', '眼睑内翻/外翻', '眼科', 'all'),
        ('L02', '角膜溃疡', '眼科', 'all')
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM vpet_diagnosis_code')
  }
}
