import { ApiHideProperty, ApiProperty } from '@nestjs/swagger'
import { Column, Entity, Index, JoinTable, ManyToMany, Relation } from 'typeorm'

import { CompleteEntity } from '~/common/entity/common.entity'

import { UserEntity } from '../../user/user.entity'
import { MenuEntity } from '../menu/menu.entity'

@Entity({ name: 'sys_role' })
@Index('uk_sys_role_tenant_name', ['tenantId', 'name'], { unique: true })
@Index('uk_sys_role_tenant_value', ['tenantId', 'value'], { unique: true })
export class RoleEntity extends CompleteEntity {
  @Column({ name: 'tenant_id', default: 1 })
  tenantId: number

  @Column({ length: 50 })
  @ApiProperty({ description: 'Role name' })
  name: string

  @Column({ comment: 'Role value' })
  @ApiProperty({ description: 'Role value' })
  value: string

  @Column({ nullable: true })
  @ApiProperty({ description: 'Role remark' })
  remark: string

  @Column({ type: 'tinyint', nullable: true, default: 1 })
  @ApiProperty({ description: 'Status: 1 enabled, 0 disabled' })
  status: number

  @Column({ nullable: true })
  @ApiProperty({ description: 'Default user role' })
  default: boolean

  @ApiHideProperty()
  @ManyToMany(() => UserEntity, user => user.roles)
  users: Relation<UserEntity[]>

  @ApiHideProperty()
  @ManyToMany(() => MenuEntity, menu => menu.roles, {})
  @JoinTable({
    name: 'sys_role_menus',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'menu_id', referencedColumnName: 'id' },
  })
  menus: Relation<MenuEntity[]>
}
