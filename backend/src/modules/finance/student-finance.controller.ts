import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { StudentFinanceService } from './student-finance.service';

@ApiTags('Finance · Students')
@ApiBearerAuth()
@Controller('finance/students')
@UseGuards(TenantGuard, FeatureGuard)
@RequireFeature(FeatureKey.FEE_MANAGEMENT)
@Roles(UserRole.SCHOOL_ADMIN)
export class StudentFinanceController {
  constructor(private readonly studentFinance: StudentFinanceService) {}

  @Get(':studentId/statement')
  statement(
    @CurrentSchool() school: RequestSchool,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.studentFinance.statement(school.id, studentId);
  }
}
