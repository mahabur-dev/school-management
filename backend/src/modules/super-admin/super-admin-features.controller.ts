import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { FeaturesService } from '../features/features.service';
import { parseFeatureKey } from '../features/feature-key';
import { UpdateSchoolFeatureDto } from '../features/dto/update-school-feature.dto';
import { UpdateSchoolFeatureFieldsDto } from '../features/dto/update-school-feature-fields.dto';
import { SchoolsService } from '../schools/schools.service';

@ApiTags('Super admin features')
@ApiBearerAuth()
@Controller('super-admin')
@UseGuards(SuperAdminGuard)
export class SuperAdminFeaturesController {
  constructor(
    private readonly features: FeaturesService,
    private readonly schools: SchoolsService,
  ) {}

  @Get('features')
  listCatalogue() {
    return this.features.listCatalogue();
  }

  @Patch('schools/:id/features/:key')
  async setFeatureEnabled(
    @Param('id', ParseUUIDPipe) schoolId: string,
    @Param('key') key: string,
    @Body() dto: UpdateSchoolFeatureDto,
  ) {
    await this.schools.getById(schoolId);
    return this.features.setSchoolFeatureEnabled(
      schoolId,
      parseFeatureKey(key),
      dto.enabled,
    );
  }

  @Get('schools/:id/features/:key')
  async getFeatureState(
    @Param('id', ParseUUIDPipe) schoolId: string,
    @Param('key') key: string,
  ) {
    await this.schools.getById(schoolId);
    return this.features.getSchoolFeatureState(schoolId, parseFeatureKey(key));
  }

  @Get('schools/:id/features/:key/fields')
  async getFieldConfiguration(
    @Param('id', ParseUUIDPipe) schoolId: string,
    @Param('key') key: string,
  ) {
    await this.schools.getById(schoolId);
    return this.features.getSchoolFieldConfiguration(
      schoolId,
      parseFeatureKey(key),
    );
  }

  @Patch('schools/:id/features/:key/fields')
  async updateFieldConfiguration(
    @Param('id', ParseUUIDPipe) schoolId: string,
    @Param('key') key: string,
    @Body() dto: UpdateSchoolFeatureFieldsDto,
  ) {
    await this.schools.getById(schoolId);
    return this.features.updateSchoolFieldConfiguration(
      schoolId,
      parseFeatureKey(key),
      dto.fields,
    );
  }
}
