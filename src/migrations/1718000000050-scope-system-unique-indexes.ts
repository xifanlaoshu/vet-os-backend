import { MigrationInterface, QueryRunner } from 'typeorm'

interface IndexRow {
  Key_name: string
  Non_unique: number
  Seq_in_index: number
  Column_name: string
}

export class ScopeSystemUniqueIndexes1718000000050 implements MigrationInterface {
  name = 'ScopeSystemUniqueIndexes1718000000050'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceSingleColumnUniqueWithTenantUnique(queryRunner, 'sys_dict_type', [
      { column: 'name', indexName: 'uk_sys_dict_type_tenant_name' },
      { column: 'code', indexName: 'uk_sys_dict_type_tenant_code' },
    ])
    await this.replaceSingleColumnUniqueWithTenantUnique(queryRunner, 'sys_config', [
      { column: 'key', indexName: 'uk_sys_config_tenant_key' },
    ])
    await this.replaceSingleColumnUniqueWithTenantUnique(queryRunner, 'sys_role', [
      { column: 'name', indexName: 'uk_sys_role_tenant_name' },
      { column: 'value', indexName: 'uk_sys_role_tenant_value' },
    ])
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(queryRunner, 'sys_dict_type', 'uk_sys_dict_type_tenant_name')
    await this.dropIndexIfExists(queryRunner, 'sys_dict_type', 'uk_sys_dict_type_tenant_code')
    await this.dropIndexIfExists(queryRunner, 'sys_config', 'uk_sys_config_tenant_key')
    await this.dropIndexIfExists(queryRunner, 'sys_role', 'uk_sys_role_tenant_name')
    await this.dropIndexIfExists(queryRunner, 'sys_role', 'uk_sys_role_tenant_value')

    await this.createUniqueIndexIfMissing(queryRunner, 'sys_dict_type', 'uk_sys_dict_type_name_global', ['name'])
    await this.createUniqueIndexIfMissing(queryRunner, 'sys_dict_type', 'uk_sys_dict_type_code_global', ['code'])
    await this.createUniqueIndexIfMissing(queryRunner, 'sys_config', 'uk_sys_config_key_global', ['key'])
    await this.createUniqueIndexIfMissing(queryRunner, 'sys_role', 'uk_sys_role_name_global', ['name'])
    await this.createUniqueIndexIfMissing(queryRunner, 'sys_role', 'uk_sys_role_value_global', ['value'])
  }

  private async replaceSingleColumnUniqueWithTenantUnique(
    queryRunner: QueryRunner,
    tableName: string,
    definitions: Array<{ column: string, indexName: string }>,
  ) {
    if (!(await queryRunner.hasTable(tableName)) || !(await queryRunner.hasColumn(tableName, 'tenant_id')))
      return

    for (const definition of definitions) {
      await this.dropSingleColumnUniqueIndexes(queryRunner, tableName, definition.column)
      await this.createUniqueIndexIfMissing(queryRunner, tableName, definition.indexName, ['tenant_id', definition.column])
    }
  }

  private async dropSingleColumnUniqueIndexes(queryRunner: QueryRunner, tableName: string, columnName: string) {
    const indexGroups = await this.readIndexGroups(queryRunner, tableName)
    for (const [indexName, rows] of indexGroups.entries()) {
      if (indexName === 'PRIMARY')
        continue
      const columns = rows
        .sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index))
        .map(row => row.Column_name)
      const isUnique = rows.every(row => Number(row.Non_unique) === 0)
      if (isUnique && columns.length === 1 && columns[0] === columnName)
        await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``)
    }
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, indexName: string) {
    if (!(await this.indexExists(queryRunner, tableName, indexName)))
      return
    await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``)
  }

  private async createUniqueIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
    columns: string[],
  ) {
    if (await this.indexExists(queryRunner, tableName, indexName))
      return
    await queryRunner.query(`CREATE UNIQUE INDEX \`${indexName}\` ON \`${tableName}\` (${columns.map(column => `\`${column}\``).join(', ')})`)
  }

  private async indexExists(queryRunner: QueryRunner, tableName: string, indexName: string) {
    if (!(await queryRunner.hasTable(tableName)))
      return false
    const indexGroups = await this.readIndexGroups(queryRunner, tableName)
    return indexGroups.has(indexName)
  }

  private async readIndexGroups(queryRunner: QueryRunner, tableName: string) {
    const rows = await queryRunner.query(`SHOW INDEX FROM \`${tableName}\``) as IndexRow[]
    const groups = new Map<string, IndexRow[]>()
    rows.forEach((row) => {
      const group = groups.get(row.Key_name) || []
      group.push(row)
      groups.set(row.Key_name, group)
    })
    return groups
  }
}
