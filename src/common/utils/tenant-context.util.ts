import { BadRequestException } from '@nestjs/common'

interface TenantContextLike {
  tenantId?: number | null
  areaId?: number | null
}

function toPositiveInteger(value?: number | null): number | null {
  const numericValue = Number(value)
  if (!Number.isInteger(numericValue) || numericValue <= 0)
    return null
  return numericValue
}

export function requireTenantContext(context?: TenantContextLike): { tenantId: number } {
  const tenantId = toPositiveInteger(context?.tenantId)
  if (!tenantId)
    throw new BadRequestException('Missing tenant context')
  return { tenantId }
}

export function requireTenantAreaContext(context?: TenantContextLike): { tenantId: number, areaId: number } {
  const { tenantId } = requireTenantContext(context)
  const areaId = toPositiveInteger(context?.areaId)
  if (!areaId)
    throw new BadRequestException('Missing tenant area context')
  return { tenantId, areaId }
}
