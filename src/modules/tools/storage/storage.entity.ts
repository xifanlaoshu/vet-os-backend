import { ApiProperty } from '@nestjs/swagger'
import { Column, Entity } from 'typeorm'

import { TenantAreaEntity } from '~/common/entity/common.entity'

@Entity({ name: 'tool_storage' })
export class Storage extends TenantAreaEntity {
  @Column({ type: 'varchar', length: 200, comment: 'file name' })
  @ApiProperty({ description: 'file name' })
  name: string

  @Column({ type: 'varchar', length: 200, nullable: true, comment: 'original file name' })
  @ApiProperty({ description: 'original file name' })
  fileName: string

  @Column({ name: 'ext_name', type: 'varchar', nullable: true, comment: 'extension name' })
  @ApiProperty({ description: 'extension name' })
  extName: string

  @Column({ type: 'varchar', comment: 'authorized access path' })
  @ApiProperty({ description: 'authorized access path' })
  path: string

  @Column({ name: 'disk_path', type: 'varchar', length: 500, nullable: true, comment: 'disk storage path' })
  @ApiProperty({ description: 'disk storage path' })
  diskPath: string | null

  @Column({ name: 'access_token', type: 'varchar', length: 80, nullable: true, unique: true, comment: 'opaque access token' })
  @ApiProperty({ description: 'opaque access token' })
  accessToken: string | null

  @Column({ name: 'token_expires_at', type: 'datetime', nullable: true, comment: 'opaque token expiration time' })
  @ApiProperty({ description: 'opaque token expiration time' })
  tokenExpiresAt: Date | null

  @Column({ type: 'varchar', nullable: true, comment: 'file type' })
  @ApiProperty({ description: 'file type' })
  type: string

  @Column({ type: 'varchar', nullable: true, comment: 'file size' })
  @ApiProperty({ description: 'file size' })
  size: string

  @Column({ nullable: true, name: 'user_id', comment: 'uploader user id' })
  @ApiProperty({ description: 'uploader user id' })
  userId: number

  @Column({ name: 'biz_type', type: 'varchar', length: 80, nullable: true, comment: 'business type' })
  @ApiProperty({ description: 'business type' })
  bizType: string | null

  @Column({ name: 'biz_id', type: 'int', nullable: true, comment: 'business id' })
  @ApiProperty({ description: 'business id' })
  bizId: number | null

  @Column({ name: 'scan_status', type: 'tinyint', default: 1, comment: 'scan status: 1 pending, 2 passed, 3 rejected' })
  @ApiProperty({ description: 'scan status' })
  scanStatus: number
}
