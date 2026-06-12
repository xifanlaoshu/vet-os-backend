import { MigrationInterface, QueryRunner } from 'typeorm'

const ROOT_ROLE_ID = 1
const STORAGE_LIST_PERMISSION = 'tool:storage:list'
const STORAGE_SIGN_PERMISSION = 'tool:storage:sign'

export class AddStorageSignPermission1718000000049 implements MigrationInterface {
  name = 'AddStorageSignPermission1718000000049'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const parentRows = await queryRunner.query(
      'SELECT id FROM sys_menu WHERE permission = ? LIMIT 1',
      [STORAGE_LIST_PERMISSION],
    )
    const parentId = parentRows?.[0]?.id
    if (!parentId)
      return

    const signId = await this.upsertSignPermission(queryRunner, parentId)
    if (!signId)
      return

    await queryRunner.query('INSERT IGNORE INTO sys_role_menus (role_id, menu_id) VALUES (?, ?)', [ROOT_ROLE_ID, signId])
    await queryRunner.query(
      `INSERT IGNORE INTO sys_role_menus (role_id, menu_id)
       SELECT DISTINCT rm.role_id, ?
       FROM sys_role_menus rm
       INNER JOIN sys_role r ON r.id = rm.role_id
       WHERE r.status = 1
         AND rm.menu_id = ?`,
      [signId, parentId],
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM sys_role_menus
       WHERE menu_id IN (SELECT id FROM sys_menu WHERE permission = ?)`,
      [STORAGE_SIGN_PERMISSION],
    )
    await queryRunner.query('DELETE FROM sys_menu WHERE permission = ?', [STORAGE_SIGN_PERMISSION])
  }

  private async upsertSignPermission(queryRunner: QueryRunner, parentId: number) {
    const rows = await queryRunner.query(
      'SELECT id FROM sys_menu WHERE parent_id = ? AND permission = ? AND type = 2 LIMIT 1',
      [parentId, STORAGE_SIGN_PERMISSION],
    )
    const existingId = rows?.[0]?.id
    const values = [
      parentId,
      null,
      '文件短链续签',
      STORAGE_SIGN_PERMISSION,
      2,
      '',
      2,
      null,
      0,
      1,
      1,
      0,
      1,
      null,
    ]

    if (existingId) {
      await queryRunner.query(
        `UPDATE sys_menu
         SET parent_id = ?, path = ?, name = ?, permission = ?, type = ?, icon = ?, order_no = ?,
             component = ?, keep_alive = ?, \`show\` = ?, status = ?, is_ext = ?, ext_open_mode = ?, active_menu = ?
         WHERE id = ?`,
        [...values, existingId],
      )
      return existingId
    }

    const result = await queryRunner.query(
      `INSERT INTO sys_menu
        (parent_id, path, name, permission, type, icon, order_no, component, keep_alive, \`show\`, status, is_ext, ext_open_mode, active_menu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values,
    )
    return result?.insertId
  }
}
