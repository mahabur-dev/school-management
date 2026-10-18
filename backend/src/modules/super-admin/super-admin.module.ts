import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { SchoolsModule } from '../schools/schools.module';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminFeaturesController } from './super-admin-features.controller';

@Module({
  imports: [SchoolsModule, FeaturesModule],
  controllers: [SuperAdminController, SuperAdminFeaturesController],
})
export class SuperAdminModule {}
