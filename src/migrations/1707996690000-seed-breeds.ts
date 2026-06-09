import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedBreeds1707996690000 implements MigrationInterface {
  name = 'SeedBreeds1707996690000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO vpet_species (code, name) VALUES
        ('dog', '犬'), ('cat', '猫'), ('rabbit', '兔'),
        ('hamster', '仓鼠'), ('chinchilla', '龙猫'), ('guinea_pig', '豚鼠'),
        ('bird', '鸟'), ('turtle', '龟'), ('snake', '蛇'),
        ('lizard', '蜥蜴'), ('other', '其他')
    `)

    await queryRunner.query(`
      INSERT INTO vpet_breed (species_code, name) VALUES
        ('dog', '金毛寻回犬'), ('dog', '拉布拉多'), ('dog', '泰迪/贵宾'),
        ('dog', '柯基'), ('dog', '哈士奇'), ('dog', '边境牧羊犬'),
        ('dog', '萨摩耶'), ('dog', '柴犬'), ('dog', '博美'),
        ('dog', '雪纳瑞'), ('dog', '比熊'), ('dog', '法国斗牛犬'),
        ('dog', '英国斗牛犬'), ('dog', '吉娃娃'), ('dog', '约克夏'),
        ('dog', '蝴蝶犬'), ('dog', '松狮'), ('dog', '阿拉斯加'),
        ('dog', '秋田'), ('dog', '德牧'), ('dog', '杜宾'),
        ('dog', '罗威纳'), ('dog', '中华田园犬'), ('dog', '八哥犬'),
        ('dog', '可卡犬'), ('dog', '马尔济斯'), ('dog', '西施犬'),
        ('cat', '英国短毛猫'), ('cat', '美国短毛猫'), ('cat', '布偶猫'),
        ('cat', '暹罗猫'), ('cat', '中华田园猫'), ('cat', '缅因猫'),
        ('cat', '波斯猫'), ('cat', '异国短毛猫'), ('cat', '苏格兰折耳猫'),
        ('cat', '斯芬克斯猫'), ('cat', '阿比西尼亚'), ('cat', '伯曼猫'),
        ('cat', '挪威森林猫'), ('cat', '土耳其梵猫')
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM vpet_breed')
    await queryRunner.query('DELETE FROM vpet_species')
  }
}
