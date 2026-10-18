import { Transform } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../../common/transformers/trim-string.transformer';

export class CreateStudentDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  className!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  rollNo!: string;

  @IsObject()
  @IsOptional()
  extraData?: Record<string, unknown>;
}

export class UpdateStudentDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @IsOptional()
  className?: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @IsOptional()
  rollNo?: string;

  @IsObject()
  @IsOptional()
  extraData?: Record<string, unknown>;
}
