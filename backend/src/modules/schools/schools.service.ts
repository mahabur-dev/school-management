import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getPagination,
  toPaginated,
} from '../../common/helpers/pagination.helper';
import { SchoolStatus } from '../../prisma';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { getSchoolAdminInvitationTemplate } from '../mail/templates/school-admin-invitation.template';
import { CreateSchoolDto } from './dto/create-school.dto';
import { ListSchoolsQueryDto } from './dto/list-schools-query.dto';
import type { UpdateSchoolProfileDto } from './dto/update-school-profile.dto';
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
    private readonly config: ConfigService,
    private readonly repository: SchoolsRepository,
    private readonly passwords: PasswordService,
    private readonly mail: MailService,
  ) {}

  /**
   * Creates a school plus its first SCHOOL_ADMIN. The administrator chooses a
   * password in the protected platform form; only its hash is persisted.
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

    const school = await this.repository.createWithAdmin({
      name: dto.name,
      slug: dto.slug,
      admin: {
        email: dto.adminEmail,
        passwordHash: await this.passwords.hash(dto.adminPassword),
        firstName: dto.adminFirstName ?? 'School',
        lastName: dto.adminLastName ?? 'Administrator',
        phoneNumber: dto.adminPhoneNumber,
      },
    });

    const { users, ...schoolFields } = school;
    const administrator = users[0];
    const loginUrl = `${this.config.getOrThrow<string>('app.webUrl')}/login/${school.slug}`;
    const invitationEmailSent = await this.mail.send({
      to: administrator.email,
      ...getSchoolAdminInvitationTemplate({
        appName: this.config.getOrThrow<string>('app.name'),
        schoolName: school.name,
        administratorName: `${administrator.firstName} ${administrator.lastName}`,
        administratorEmail: administrator.email,
        password: dto.adminPassword,
        loginUrl,
      }),
    });
    return { school: schoolFields, admin: administrator, invitationEmailSent };
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

  async updateOwnProfile(id: string, dto: UpdateSchoolProfileDto) {
    await this.getById(id);
    return this.repository.updateProfile(id, dto);
  }

  async updateStatus(id: string, status: SchoolStatus) {
    await this.getById(id);
    return this.repository.updateStatus(id, status);
  }
}
