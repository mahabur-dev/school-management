import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Resolves an active tenant before its administrator signs in.
 * A school name is friendlier for people; the URL-safe workspace ID remains a
 * precise alternative when organisations have similar names.
 */
export class ResolveTenantDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  query!: string;
}
