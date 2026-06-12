import { ApiProperty } from '@nestjs/swagger'

export class StorageInfo {
  @ApiProperty({ description: 'file id' })
  id: number

  @ApiProperty({ description: 'file name' })
  name: string

  @ApiProperty({ description: 'extension name' })
  extName: string

  @ApiProperty({ description: 'authorized access path' })
  path: string

  @ApiProperty({ description: 'business type' })
  bizType: string

  @ApiProperty({ description: 'business id' })
  bizId: number

  @ApiProperty({ description: 'scan status' })
  scanStatus: number

  @ApiProperty({ description: 'file type' })
  type: string

  @ApiProperty({ description: 'file size' })
  size: string

  @ApiProperty({ description: 'created at' })
  createdAt: string

  @ApiProperty({ description: 'uploader username' })
  username: string
}
