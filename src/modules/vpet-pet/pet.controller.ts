import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { CreatePetDto, QueryPetDto, UpdatePetDto } from './dto/pet.dto'
import { PetEntity } from './entities/pet.entity'
import { PetService } from './pet.service'

@ApiTags('VPet - 宠物档案')
@Controller('vpet/pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get()
  @ApiOperation({ summary: '宠物列表' })
  @ApiResult({ type: [PetEntity], isPage: true })
  async list(@Query() dto: QueryPetDto) {
    return this.petService.list(dto)
  }

  @Get('species-options')
  @ApiOperation({ summary: '物种字典' })
  async speciesOptions() {
    return this.petService.getSpeciesOptions()
  }

  @Get('breed-options')
  @ApiOperation({ summary: '品种字典' })
  async breedOptions(@Query('species') species: string) {
    return this.petService.getBreedOptions(species)
  }

  @Get(':id')
  @ApiOperation({ summary: '宠物详情' })
  @ApiResult({ type: PetEntity })
  async get(@IdParam() id: number) {
    return this.petService.findOne(id)
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: '健康档案时间线' })
  async getTimeline(@IdParam() id: number) {
    return this.petService.getHealthTimeline(id)
  }

  @Post()
  @ApiOperation({ summary: '创建宠物' })
  @ApiResult({ type: PetEntity })
  async create(@Body() dto: CreatePetDto) {
    return this.petService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新宠物' })
  async update(@IdParam() id: number, @Body() dto: UpdatePetDto) {
    await this.petService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除宠物' })
  async delete(@IdParam() id: number) {
    await this.petService.delete(id)
  }

  @Post(':id/weight')
  @ApiOperation({ summary: '记录体重' })
  async recordWeight(
    @IdParam() id: number,
    @Body('weight') weight: number,
    @Body('bcs') bcs?: number,
  ) {
    return this.petService.recordWeight(id, weight, bcs)
  }
}
