import { Module } from '@nestjs/common';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { MeFeaturesController } from './me-features.controller';
import { FeaturesRepository } from './features.repository';
import { FeaturesService } from './features.service';

@Module({
  controllers: [MeFeaturesController],
  providers: [FeaturesRepository, FeaturesService, FeatureGuard],
  exports: [FeaturesService, FeatureGuard],
})
export class FeaturesModule {}
