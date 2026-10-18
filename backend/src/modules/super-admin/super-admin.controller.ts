import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CreateSchoolDto } from '../schools/dto/create-school.dto';
import { ListSchoolsQueryDto } from '../schools/dto/list-schools-query.dto';
import { UpdateSchoolStatusDto } from '../schools/dto/update-school-status.dto';
import { SchoolsService } from '../schools/schools.service';

/** Platform operations. Super admins belong to no school, hence no TenantGuard. */
@ApiTags('Super admin')
@ApiBearerAuth()
@Controller('super-admin/schools')
@UseGuards(SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly schools: SchoolsService) {}

  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.schools.createWithAdmin(dto);
  }

  @Get()
  list(@Query() query: ListSchoolsQueryDto) {
    return this.schools.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.schools.getById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolStatusDto,
  ) {
    return this.schools.updateStatus(id, dto.status);
  }
}
