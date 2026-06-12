import { ApiProperty } from '@nestjs/swagger'
import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString } from 'class-validator'

import { PagerDto } from '~/common/dto/pager.dto'

export class StoragePageDto extends PagerDto {
  @ApiProperty({ description: 'file name' })
  @IsOptional()
  @IsString()
  name: string

  @ApiProperty({ description: 'extension name' })
  @IsString()
  @IsOptional()
  extName: string

  @ApiProperty({ description: 'file type' })
  @IsString()
  @IsOptional()
  type: string

  @ApiProperty({ description: 'file size' })
  @IsString()
  @IsOptional()
  size: string

  @ApiProperty({ description: 'upload time range' })
  @IsOptional()
  time: string[]

  @ApiProperty({ description: 'uploader username' })
  @IsString()
  @IsOptional()
  username: string

  @ApiProperty({ description: 'business type' })
  @IsString()
  @IsOptional()
  bizType?: string

  @ApiProperty({ description: 'business id' })
  @IsInt()
  @IsOptional()
  bizId?: number
}

export class StorageCreateDto {
  @ApiProperty({ description: 'file name' })
  @IsString()
  name: string

  @ApiProperty({ description: 'original file name' })
  @IsString()
  fileName: string

  @ApiProperty({ description: 'extension name' })
  @IsString()
  extName: string

  @ApiProperty({ description: 'authorized access path' })
  @IsString()
  path: string

  @ApiProperty({ description: 'file type' })
  @IsString()
  type: string

  @ApiProperty({ description: 'file size' })
  @IsString()
  size: string

  @ApiProperty({ description: 'business type' })
  @IsString()
  @IsOptional()
  bizType?: string

  @ApiProperty({ description: 'business id' })
  @IsInt()
  @IsOptional()
  bizId?: number
}

export class StorageDeleteDto {
  @ApiProperty({ description: 'file ids to delete', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  ids: number[]
}
