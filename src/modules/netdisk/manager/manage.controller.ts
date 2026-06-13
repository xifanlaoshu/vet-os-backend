import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'

import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import { checkIsDemoMode } from '~/utils'

import { SFileInfoDetail, SFileList, UploadToken } from './manage.class'
import {
  DeleteDto,
  FileInfoDto,
  FileOpDto,
  GetFileListDto,
  MarkFileDto,
  MKDirDto,
  RenameDto,
} from './manage.dto'
import { NetDiskManageService } from './manage.service'

export const permissions = definePermission('netdisk:manage', {
  LIST: 'list',
  CREATE: 'create',
  INFO: 'info',
  UPDATE: 'update',
  DELETE: 'delete',
  MKDIR: 'mkdir',
  TOKEN: 'token',
  MARK: 'mark',
  DOWNLOAD: 'download',
  RENAME: 'rename',
  CUT: 'cut',
  COPY: 'copy',
} as const)

@ApiTags('NetDiskManage - 网盘管理模块')
@Controller('manage')
export class NetDiskManageController {
  constructor(private manageService: NetDiskManageService) {}

  @Get('list')
  @ApiOperation({ summary: '获取文件列表' })
  @ApiOkResponse({ type: SFileList })
  @Perm(permissions.LIST)
  async list(@Query() dto: GetFileListDto, @AuthUser() user: IAuthUser): Promise<SFileList> {
    return await this.manageService.getFileList(dto.path, dto.marker, dto.key, user)
  }

  @Post('mkdir')
  @ApiOperation({ summary: '创建文件夹，支持多级' })
  @Perm(permissions.MKDIR)
  async mkdir(@Body() dto: MKDirDto, @AuthUser() user: IAuthUser): Promise<void> {
    const result = await this.manageService.checkFileExist(
      this.manageService.buildScopedKey(`${dto.path}${dto.dirName}/`, user),
    )
    if (result)
      throw new BusinessException(ErrorEnum.OSS_FILE_OR_DIR_EXIST)

    await this.manageService.createDir(this.manageService.buildScopedKey(`${dto.path}${dto.dirName}`, user))
  }

  @Get('token')
  @ApiOperation({ summary: '获取上传Token，无Token前端无法上传' })
  @ApiOkResponse({ type: UploadToken })
  @Perm(permissions.TOKEN)
  async token(@Query() dto: FileInfoDto, @AuthUser() user: IAuthUser): Promise<UploadToken> {
    checkIsDemoMode()

    const key = this.manageService.buildScopedKey(`${dto.path}${dto.name}`, user)
    return {
      token: this.manageService.createUploadToken(`${user.uid}`, key),
      prefix: this.manageService.getTenantAreaPrefix(user),
      key,
    }
  }

  @Get('info')
  @ApiOperation({ summary: '获取文件详细信息' })
  @ApiOkResponse({ type: SFileInfoDetail })
  @Perm(permissions.INFO)
  async info(@Query() dto: FileInfoDto, @AuthUser() user: IAuthUser): Promise<SFileInfoDetail> {
    return await this.manageService.getFileInfo(dto.name, dto.path, user)
  }

  @Post('mark')
  @ApiOperation({ summary: '添加文件备注' })
  @Perm(permissions.MARK)
  async mark(@Body() dto: MarkFileDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.manageService.changeFileHeaders(dto.name, dto.path, {
      mark: dto.mark,
    }, user)
  }

  @Get('download')
  @ApiOperation({ summary: '获取下载链接，不支持下载文件夹' })
  @ApiOkResponse({ type: String })
  @Perm(permissions.DOWNLOAD)
  async download(@Query() dto: FileInfoDto, @AuthUser() user: IAuthUser): Promise<string> {
    return this.manageService.getDownloadLink(this.manageService.buildScopedKey(`${dto.path}${dto.name}`, user))
  }

  @Post('rename')
  @ApiOperation({ summary: '重命名文件或文件夹' })
  @Perm(permissions.RENAME)
  async rename(@Body() dto: RenameDto, @AuthUser() user: IAuthUser): Promise<void> {
    const result = await this.manageService.checkFileExist(
      this.manageService.buildScopedKey(`${dto.path}${dto.toName}${dto.type === 'dir' ? '/' : ''}`, user),
    )
    if (result)
      throw new BusinessException(ErrorEnum.OSS_FILE_OR_DIR_EXIST)

    if (dto.type === 'file')
      await this.manageService.renameFile(dto.path, dto.name, dto.toName, user)
    else
      await this.manageService.renameDir(dto.path, dto.name, dto.toName, user)
  }

  @Post('delete')
  @ApiOperation({ summary: '删除文件或文件夹' })
  @Perm(permissions.DELETE)
  async delete(@Body() dto: DeleteDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.manageService.deleteMultiFileOrDir(dto.files, dto.path, user)
  }

  @Post('cut')
  @ApiOperation({ summary: '剪切文件或文件夹，支持批量' })
  @Perm(permissions.CUT)
  async cut(@Body() dto: FileOpDto, @AuthUser() user: IAuthUser): Promise<void> {
    if (dto.originPath === dto.toPath)
      throw new BusinessException(ErrorEnum.OSS_NO_OPERATION_REQUIRED)

    await this.manageService.moveMultiFileOrDir(
      dto.files,
      dto.originPath,
      dto.toPath,
      user,
    )
  }

  @Post('copy')
  @ApiOperation({ summary: '复制文件或文件夹，支持批量' })
  @Perm(permissions.COPY)
  async copy(@Body() dto: FileOpDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.manageService.copyMultiFileOrDir(
      dto.files,
      dto.originPath,
      dto.toPath,
      user,
    )
  }
}
