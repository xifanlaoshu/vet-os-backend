import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { ChargeItemEntity } from '~/modules/vpet-pharmacy/entities/charge-item.entity'
import { ConsentTemplateEntity } from './consent-template.entity'

@Index('idx_vpet_consent_charge_item_unique', ['chargeItemId', 'templateId'], { unique: true })
@Index('idx_vpet_consent_charge_item_item', ['chargeItemId'])
@Index('idx_vpet_consent_charge_item_template', ['templateId'])
@Entity('vpet_consent_template_charge_item')
export class ConsentTemplateChargeItemEntity extends CommonEntity {
  @Column({ name: 'charge_item_id' })
  chargeItemId: number

  @ManyToOne(() => ChargeItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'charge_item_id' })
  chargeItem: ChargeItemEntity

  @Column({ name: 'template_id' })
  templateId: number

  @ManyToOne(() => ConsentTemplateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ConsentTemplateEntity
}
