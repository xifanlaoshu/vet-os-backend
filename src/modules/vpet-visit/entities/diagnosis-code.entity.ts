import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('vpet_diagnosis_code')
export class DiagnosisCodeEntity {
  @PrimaryColumn({ length: 10 })
  code: string

  @Column({ length: 100 })
  name: string

  @Column({ length: 30 })
  category: string

  @Column({ length: 20, default: 'all', name: 'species_scope' })
  speciesScope: string
}
