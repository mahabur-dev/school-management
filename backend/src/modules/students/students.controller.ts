import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(TenantGuard, FeatureGuard)
@RequireFeature(FeatureKey.STUDENT_MANAGEMENT)
@Roles(UserRole.SCHOOL_ADMIN)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}
  @Get() list(
    @CurrentSchool() school: RequestSchool,
    @Query() query: ListStudentsQueryDto,
  ) {
    return this.students.list(school.id, query);
  }
  @Post() create(
    @CurrentSchool() school: RequestSchool,
    @Body() dto: CreateStudentDto,
  ) {
    return this.students.create(school.id, dto);
  }
  @Get(':id') get(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.students.get(school.id, id);
  }
  @Patch(':id') update(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(school.id, id, dto);
  }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) async remove(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.students.remove(school.id, id);
  }
}
