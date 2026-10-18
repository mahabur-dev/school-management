import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../prisma';
import { trimString } from '../../../common/transformers/trim-string.transformer';

export class PaymentAllocationDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  @Matches(/^(?:[1-9]\d{0,17})$/)
  amountMinor!: string;
}

export class RecordPaymentDto {
  @IsString()
  @Matches(/^(?:[1-9]\d{0,17})$/)
  amountMinor!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsDateString()
  receivedOn!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(150)
  @IsOptional()
  referenceNumber?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];

  @IsObject()
  @IsOptional()
  extraData?: Record<string, unknown>;
}

export class ReversePaymentDto {
  @Transform(trimString)
  @IsString()
  @MinLength(3)
  @MaxLength(2_000)
  reason!: string;
}
