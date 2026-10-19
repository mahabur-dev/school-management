import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../../common/transformers/trim-string.transformer';

const PHONE_PATTERN = /^[+0-9()\-\s]{7,32}$/;

export class UpdateProfileDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @IsOptional()
  firstName?: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @IsOptional()
  lastName?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'phoneNumber must be a valid phone number',
  })
  @IsOptional()
  phoneNumber?: string | null;
}
