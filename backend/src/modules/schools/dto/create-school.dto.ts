import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail } from '../../../common/transformers/normalize-email.transformer';
import { trimString } from '../../../common/transformers/trim-string.transformer';

export const SCHOOL_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]$/;

export class CreateSchoolDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  /** Becomes the subdomain later (dps.example.com). Lowercase letters, digits, hyphens. */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(SCHOOL_SLUG_PATTERN, {
    message:
      'slug must be 3-63 characters: lowercase letters, digits and hyphens, not starting or ending with a hyphen',
  })
  slug!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @IsOptional()
  adminFirstName?: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @IsOptional()
  adminLastName?: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  adminEmail!: string;

  /** Chosen by the first school administrator; never returned by this API. */
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  adminPassword!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(32)
  @IsOptional()
  adminPhoneNumber?: string;
}
