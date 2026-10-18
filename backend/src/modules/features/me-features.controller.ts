import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentSchool } from '../../common/decorators/current-school.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequestSchool } from '../../common/types/request-context.type';
import { UserRole } from '../../prisma';
import { parseFeatureKey } from './feature-key';
import { FeaturesService } from './features.service';

@ApiTags('Features')
@ApiBearerAuth()
@Controller('me/features')
@UseGuards(TenantGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class MeFeaturesController {
  constructor(private readonly features: FeaturesService) {}

  @Get()
  list(@CurrentSchool() school: RequestSchool) {
    return this.features.getEnabledForSchool(school.id);
  }

  @Get(':key/fields')
  fields(@CurrentSchool() school: RequestSchool, @Param('key') key: string) {
    return this.features.getFieldConfigurationForSchool(
      school.id,
      parseFeatureKey(key),
    );
  }
}
