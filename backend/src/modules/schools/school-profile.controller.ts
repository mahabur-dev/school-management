import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentSchool } from '../../common/decorators/current-school.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequestSchool } from '../../common/types/request-context.type';
import { UserRole } from '../../prisma';
import { UpdateSchoolProfileDto } from './dto/update-school-profile.dto';
import { SchoolsService } from './schools.service';

@ApiTags('School profile')
@ApiBearerAuth()
@Controller('schools/me')
@UseGuards(TenantGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class SchoolProfileController {
  constructor(private readonly schools: SchoolsService) {}

  @Patch()
  update(
    @CurrentSchool() school: RequestSchool,
    @Body() dto: UpdateSchoolProfileDto,
  ) {
    return this.schools.updateOwnProfile(school.id, dto);
  }
}
