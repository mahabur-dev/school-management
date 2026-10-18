import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolsRepository } from './schools.repository';
import { SchoolsService } from './schools.service';

@Module({
  imports: [AuthModule],
  providers: [SchoolsService, SchoolsRepository],
  exports: [SchoolsService],
})
export class SchoolsModule {}
