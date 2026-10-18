import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../../common/transformers/trim-string.transformer';

export class CreateFeeCategoryDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(2_000)
  @IsOptional()
  description?: string;
}

export class UpdateFeeCategoryDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(2_000)
  @IsOptional()
  description?: string;
}

export class UpdateFeeCategoryStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
