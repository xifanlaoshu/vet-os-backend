import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import { CreatePetDto, QueryPetDto, UpdatePetDto } from './dto/pet.dto'
import { PetEntity } from './entities/pet.entity'
import { PetService } from './pet.service'

@ApiTags('VPet - 宠物档案')
@Perm('vpet:pet:list')
@Controller('vpet/pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get()
  @ApiOperation({ summary: '宠物列表' })
  @ApiResult({ type: [PetEntity], isPage: true })
  async list(@Query() dto: QueryPetDto, @AuthUser() user: IAuthUser) {
    return this.petService.list(dto, user)
  }

  @Get('species-options')
  @ApiOperation({ summary: '物种字典' })
  async speciesOptions(@AuthUser() user: IAuthUser) {
    return this.petService.getSpeciesOptions(user)
  }

  @Get('breed-options')
  @ApiOperation({ summary: '品种字典' })
  async breedOptions(@Query('species') species: string, @AuthUser() user: IAuthUser) {
    return this.petService.getBreedOptions(species, user)
  }

  @Get(':id')
  @ApiOperation({ summary: '宠物详情' })
  @ApiResult({ type: PetEntity })
  async get(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.petService.getById(id, user)
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: '健康档案时间线' })
  async getTimeline(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.petService.getHealthTimeline(id, user)
  }

  @Post()
  @ApiOperation({ summary: '创建宠物' })
  @ApiResult({ type: PetEntity })
  async create(@Body() dto: CreatePetDto, @AuthUser() user: IAuthUser) {
    return this.petService.createPet(dto, user)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新宠物' })
  async update(@IdParam() id: number, @Body() dto: UpdatePetDto, @AuthUser() user: IAuthUser) {
    await this.petService.updatePet(id, dto, user)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除宠物' })
  async delete(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    await this.petService.deletePet(id, user)
  }

  @Post(':id/weight')
  @ApiOperation({ summary: '记录体重' })
  async recordWeight(
    @IdParam() id: number,
    @Body('weight') weight: number,
    @Body('bcs') bcs?: number,
    @AuthUser() user?: IAuthUser,
  ) {
    return this.petService.recordWeight(id, weight, bcs, 1, user)
  }
}
