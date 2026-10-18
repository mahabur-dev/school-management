import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { trimString } from '../../../common/transformers/trim-string.transformer';
import { SchoolStatus } from '../../../prisma';

export class ListSchoolsQueryDto extends PaginationQueryDto {
  @IsEnum(SchoolStatus)
  @IsOptional()
  status?: SchoolStatus;

  /** Matches name or slug, case-insensitive. */
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;
}
