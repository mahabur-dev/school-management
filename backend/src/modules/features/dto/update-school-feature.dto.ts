import { IsBoolean } from 'class-validator';

export class UpdateSchoolFeatureDto {
  @IsBoolean()
  enabled!: boolean;
}
