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
  CreateFeeCategoryDto,
  UpdateFeeCategoryDto,
  UpdateFeeCategoryStatusDto,
} from './dto/fee-category.dto';
import { FinanceService } from './finance.service';

@ApiTags('Finance · Fee categories')
@ApiBearerAuth()
@Controller('finance/fee-categories')
@UseGuards(TenantGuard, FeatureGuard)
@RequireFeature(FeatureKey.FEE_MANAGEMENT)
@Roles(UserRole.SCHOOL_ADMIN)
export class FeeCategoriesController {
  constructor(private readonly finance: FinanceService) {}
  @Get() list(@CurrentSchool() school: RequestSchool) {
    return this.finance.listCategories(school.id);
  }
  @Post() create(
    @CurrentSchool() school: RequestSchool,
    @Body() dto: CreateFeeCategoryDto,
  ) {
    return this.finance.createCategory(school.id, dto);
  }
  @Get(':id') get(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.getCategory(school.id, id);
  }
  @Patch(':id') update(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeeCategoryDto,
  ) {
    return this.finance.updateCategory(school.id, id, dto);
  }
  @Patch(':id/status') updateStatus(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeeCategoryStatusDto,
  ) {
    return this.finance.updateCategoryStatus(school.id, id, dto.isActive);
  }
}
