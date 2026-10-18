import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentSchool } from '../../common/decorators/current-school.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequestSchool } from '../../common/types/request-context.type';
import { UserRole } from '../../prisma';
import { UsersService } from './users.service';

/**
 * Reference pattern for every tenant-scoped controller:
 * TenantGuard binds the school, @Roles limits who may call, and the service
 * receives `school.id` explicitly.
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(TenantGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(
    @CurrentSchool() school: RequestSchool,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listForSchool(school.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getForSchool(school.id, id);
  }
}
