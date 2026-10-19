import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../../common/transformers/trim-string.transformer';

const PHONE_PATTERN = /^[+0-9()\-\s]{7,32}$/;
const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class UpdateSchoolProfileDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toLowerCase()
      : null,
  )
  @IsEmail()
  @MaxLength(254)
  @IsOptional()
  contactEmail?: string | null;

  @Transform(optionalText)
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phoneNumber must be a valid phone number',
  })
  @IsOptional()
  phoneNumber?: string | null;

  @Transform(optionalText)
  @IsUrl({ require_protocol: true }, { message: 'websiteUrl must be a valid URL' })
  @MaxLength(500)
  @IsOptional()
  websiteUrl?: string | null;

  @Transform(optionalText)
  @IsString()
  @MaxLength(180)
  @IsOptional()
  addressLine1?: string | null;

  @Transform(optionalText)
  @IsString()
  @MaxLength(180)
  @IsOptional()
  addressLine2?: string | null;

  @Transform(optionalText)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string | null;

  @Transform(optionalText)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  stateOrProvince?: string | null;

  @Transform(optionalText)
  @IsString()
  @MaxLength(24)
  @IsOptional()
  postalCode?: string | null;

  @Transform(optionalText)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string | null;
}
