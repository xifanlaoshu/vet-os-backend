import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from './entities/pet.entity'
import { BreedEntity, SpeciesEntity } from './entities/species.entity'
import { WeightRecordEntity } from './entities/weight-record.entity'
import { PetController } from './pet.controller'
import { PetService } from './pet.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([PetEntity, CustomerEntity, WeightRecordEntity, SpeciesEntity, BreedEntity]),
  ],
  controllers: [PetController],
  providers: [PetService],
  exports: [PetService, TypeOrmModule],
})
export class VpetPetModule {}
