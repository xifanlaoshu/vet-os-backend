import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

const PASSWORD_POLICY = /^\S*(?=\S{12}$)(?=\S*\d)(?=\S*[A-Z])\S*$/i
const PASSWORD_POLICY_MESSAGE = 'Password must be 12-64 characters and contain letters and numbers'

export class PasswordUpdateDto {
  @ApiProperty({ description: 'Old password' })
  @IsString()
  @MinLength(12)
  @MaxLength(64)
  oldPassword: string

  @ApiProperty({ description: 'New password' })
  @IsString()
  @Matches(PASSWORD_POLICY, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  newPassword: string
}

export class UserPasswordDto {
  @ApiProperty({ description: 'New password' })
  @IsString()
  @Matches(PASSWORD_POLICY, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password: string
}

export class UserExistDto {
  @ApiProperty({ description: 'Login account' })
  @IsString()
  @Matches(/^[\w-]{4,20}$/)
  @MinLength(4)
  @MaxLength(20)
  username: string
}
