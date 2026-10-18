import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { normalizeEmail } from '../../../common/transformers/normalize-email.transformer';

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(72)
  password!: string;

  @IsBoolean()
  @IsOptional()
  rememberMe: boolean = false;

  @IsIn(['PLATFORM', 'SCHOOL'])
  portal!: 'PLATFORM' | 'SCHOOL';

  @ValidateIf((value: LoginDto) => value.portal === 'SCHOOL')
  @IsDefined()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]$/, {
    message: 'Enter a valid school workspace ID',
  })
  tenantSlug?: string;
}
