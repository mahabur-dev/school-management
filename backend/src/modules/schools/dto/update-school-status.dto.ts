import { IsEnum } from 'class-validator';
import { SchoolStatus } from '../../../prisma';

export class UpdateSchoolStatusDto {
  @IsEnum(SchoolStatus)
  status!: SchoolStatus;
}
