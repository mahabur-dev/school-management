import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FeeBillingFrequency } from '../../../prisma';
import { trimString } from '../../../common/transformers/trim-string.transformer';

const MINOR_AMOUNT = /^(?:[1-9]\d{0,17})$/;

export class FeeStructureItemDto {
  @IsUUID()
  feeCategoryId!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(2_000)
  @IsOptional()
  description?: string;

  /** Decimal strings are forbidden; all financial values are minor units. */
  @IsString()
  @Matches(MINOR_AMOUNT, {
    message: 'amountMinor must be a positive minor-unit integer string',
  })
  amountMinor!: string;
}

export class CreateFeeStructureDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
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
  @MaxLength(30)
  academicYear!: string;

  @IsEnum(FeeBillingFrequency)
  billingFrequency!: FeeBillingFrequency;

  @IsDateString()
  effectiveFrom!: string;

  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FeeStructureItemDto)
  items!: FeeStructureItemDto[];
}

export class UpdateFeeStructureDto extends CreateFeeStructureDto {}
