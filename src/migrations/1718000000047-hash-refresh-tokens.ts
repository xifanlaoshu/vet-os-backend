import { MigrationInterface, QueryRunner } from 'typeorm'

export class HashRefreshTokens1718000000047 implements MigrationInterface {
  name = 'HashRefreshTokens1718000000047'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE user_refresh_tokens
      SET value = SHA2(value, 256)
      WHERE CHAR_LENGTH(value) <> 64
    `)
    await queryRunner.query(`
      ALTER TABLE user_refresh_tokens
      MODIFY value varchar(128) NOT NULL COMMENT '刷新令牌哈希值'
    `)

    if (!await this.hasIndex(queryRunner, 'idx_user_refresh_token_value')) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX idx_user_refresh_token_value
        ON user_refresh_tokens (value)
      `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, 'idx_user_refresh_token_value'))
      await queryRunner.query('DROP INDEX idx_user_refresh_token_value ON user_refresh_tokens')

    await queryRunner.query(`
      ALTER TABLE user_refresh_tokens
      MODIFY value varchar(500) NOT NULL
    `)
  }

  private async hasIndex(queryRunner: QueryRunner, indexName: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_refresh_tokens'
          AND INDEX_NAME = ?
        LIMIT 1
      `,
      [indexName],
    )
    return rows.length > 0
  }
}
