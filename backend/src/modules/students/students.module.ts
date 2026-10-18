import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { StudentFieldValidationService } from './student-field-validation.service';
import { StudentsController } from './students.controller';
import { StudentsRepository } from './students.repository';
import { StudentsService } from './students.service';
@Module({
  imports: [FeaturesModule],
  controllers: [StudentsController],
  providers: [
    StudentsRepository,
    StudentFieldValidationService,
    StudentsService,
  ],
  exports: [StudentsService],
})
export class StudentsModule {}
