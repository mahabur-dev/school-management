import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UpdateSchoolFeatureFieldDto {
  @IsString()
  @MaxLength(80)
  key!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsBoolean()
  required!: boolean;
}

export class UpdateSchoolFeatureFieldsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateSchoolFeatureFieldDto)
  fields!: UpdateSchoolFeatureFieldDto[];
}
