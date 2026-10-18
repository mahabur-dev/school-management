import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { trimString } from '../../../common/transformers/trim-string.transformer';

const MINOR_AMOUNT = /^(?:0|[1-9]\d{0,17})$/;

export class InvoiceItemDto {
  @IsUUID() feeCategoryId!: string;
  @Transform(trimString) @IsString() @MaxLength(2_000) description!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10_000) quantity!: number;
  @IsString()
  @Matches(/^(?:[1-9]\d{0,17})$/, {
    message: 'unitAmountMinor must be a positive minor-unit integer string',
  })
  unitAmountMinor!: string;
}

export class CreateInvoiceDto {
  @IsUUID() studentId!: string;
  @IsUUID() @IsOptional() feeStructureId?: string;
  @Transform(trimString) @IsString() @MaxLength(30) academicYear!: string;
  @IsDateString() @IsOptional() billingPeriod?: string;
  @IsDateString() dueDate!: string;
  @IsString()
  @Matches(MINOR_AMOUNT, {
    message: 'discountMinor must be a non-negative minor-unit integer string',
  })
  @IsOptional()
  discountMinor?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
  @IsObject() @IsOptional() extraData?: Record<string, unknown>;
}

export class UpdateDraftInvoiceDto extends CreateInvoiceDto {}
