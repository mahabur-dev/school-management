import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { trimString } from '../../../common/transformers/trim-string.transformer';

export class ListStudentsQueryDto extends PaginationQueryDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  @IsOptional()
  className?: string;
}
