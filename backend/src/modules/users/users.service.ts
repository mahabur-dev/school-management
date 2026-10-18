import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  getPagination,
  toPaginated,
} from '../../common/helpers/pagination.helper';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async listForSchool(schoolId: string, query: PaginationQueryDto) {
    const pagination = getPagination(query.page, query.limit);
    const { items, total } = await this.repository.findPageBySchool(
      schoolId,
      pagination,
    );
    return toPaginated(items, total, pagination);
  }

  async getForSchool(schoolId: string, id: string) {
    const user = await this.repository.findByIdInSchool(schoolId, id);
    // Same response for "does not exist" and "belongs to another school".
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
