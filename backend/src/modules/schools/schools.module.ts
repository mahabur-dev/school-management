import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { SchoolsRepository } from './schools.repository';
import { SchoolsService } from './schools.service';
import { SchoolProfileController } from './school-profile.controller';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [SchoolProfileController],
  providers: [SchoolsService, SchoolsRepository],
  exports: [SchoolsService],
})
export class SchoolsModule {}
