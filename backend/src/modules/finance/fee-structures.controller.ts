import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentSchool } from '../../common/decorators/current-school.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequestSchool } from '../../common/types/request-context.type';
import { FeatureKey, UserRole } from '../../prisma';
import {
  CreateFeeStructureDto,
  UpdateFeeStructureDto,
} from './dto/fee-structure.dto';
import { FinanceService } from './finance.service';

@ApiTags('Finance · Fee structures')
@ApiBearerAuth()
@Controller('finance/fee-structures')
@UseGuards(TenantGuard, FeatureGuard)
@RequireFeature(FeatureKey.FEE_MANAGEMENT)
@Roles(UserRole.SCHOOL_ADMIN)
export class FeeStructuresController {
  constructor(private readonly finance: FinanceService) {}
  @Get() list(@CurrentSchool() school: RequestSchool) {
    return this.finance.listStructures(school.id);
  }
  @Post() create(
    @CurrentSchool() school: RequestSchool,
    @Body() dto: CreateFeeStructureDto,
  ) {
    return this.finance.createStructure(school.id, dto);
  }
  @Get(':id') get(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.getStructure(school.id, id);
  }
  @Patch(':id') update(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeeStructureDto,
  ) {
    return this.finance.updateDraftStructure(school.id, id, dto);
  }
  @Post(':id/activate') activate(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.activateStructure(school.id, id);
  }
  @Post(':id/archive') archive(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.archiveStructure(school.id, id);
  }
}
