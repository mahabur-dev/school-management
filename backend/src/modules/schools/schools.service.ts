import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  getPagination,
  toPaginated,
} from '../../common/helpers/pagination.helper';
import { generateTempPassword } from '../../common/helpers/temp-password.helper';
import { SchoolStatus } from '../../prisma';
import { PasswordService } from '../auth/password.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { ListSchoolsQueryDto } from './dto/list-schools-query.dto';
import { SchoolsRepository } from './schools.repository';

/** Slugs that would collide with platform subdomains. */
const RESERVED_SLUGS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'mail',
  'static',
  'assets',
  'docs',
  'status',
  'support',
]);

@Injectable()
export class SchoolsService {
  constructor(
    private readonly repository: SchoolsRepository,
    private readonly passwords: PasswordService,
  ) {}

  /**
   * Creates a school plus its first SCHOOL_ADMIN. The temporary password is
   * returned once and never stored in plain text; the admin must change it at
   * first login.
   */
  async createWithAdmin(dto: CreateSchoolDto) {
    if (RESERVED_SLUGS.has(dto.slug)) {
      throw new ConflictException('This slug is reserved');
    }
    if (await this.repository.findBySlug(dto.slug)) {
      throw new ConflictException('A school with this slug already exists');
    }
    if (await this.repository.emailInUse(dto.adminEmail)) {
      throw new ConflictException('A user with this email already exists');
    }

    const temporaryPassword = generateTempPassword();
    const school = await this.repository.createWithAdmin({
      name: dto.name,
      slug: dto.slug,
      admin: {
        email: dto.adminEmail,
        passwordHash: await this.passwords.hash(temporaryPassword),
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        phoneNumber: dto.adminPhoneNumber,
      },
    });

    const { users, ...schoolFields } = school;
    return { school: schoolFields, admin: users[0], temporaryPassword };
  }

  async list(query: ListSchoolsQueryDto) {
    const pagination = getPagination(query.page, query.limit);
    const { items, total } = await this.repository.findPage({
      skip: pagination.skip,
      take: pagination.take,
      status: query.status,
      search: query.search,
    });
    return toPaginated(items, total, pagination);
  }

  async getById(id: string) {
    const school = await this.repository.findById(id);
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async updateStatus(id: string, status: SchoolStatus) {
    await this.getById(id);
    return this.repository.updateStatus(id, status);
  }
}
