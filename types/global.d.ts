declare global {
  interface IAuthUser {
    uid: number
    pv: number
    /** 过期时间 */
    exp?: number
    /** 签发时间 */
    iat?: number
    roles?: string[]
    accountId?: number
    tenantId?: number
    tenantName?: string
    areaId?: number
    areaName?: string
    accessibleAreaIds?: number[]
    platformAdmin?: boolean
    contextSelected?: boolean
  }

  export interface IBaseResponse<T = any> {
    message: string
    code: number
    data?: T
  }

  export interface IListRespData<T = any> {
    items: T[]
  }
}

export {}
