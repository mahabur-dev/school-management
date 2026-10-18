import { Module } from '@nestjs/common';
import { SchoolsModule } from '../schools/schools.module';
import { SuperAdminController } from './super-admin.controller';

@Module({
  imports: [SchoolsModule],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
