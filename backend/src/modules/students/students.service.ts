import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../prisma';
import {
  getPagination,
  toPaginated,
} from '../../common/helpers/pagination.helper';
import { StudentFieldValidationService } from './student-field-validation.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentsRepository } from './students.repository';

@Injectable()
export class StudentsService {
  constructor(
    private readonly repository: StudentsRepository,
    private readonly fields: StudentFieldValidationService,
  ) {}

  async list(schoolId: string, query: ListStudentsQueryDto) {
    const page = getPagination(query.page, query.limit);
    const result = await this.repository.findPage(schoolId, {
      ...page,
      search: query.search,
      className: query.className,
    });
    return toPaginated(result.items, result.total, page);
  }

  async get(schoolId: string, id: string) {
    const student = await this.repository.findActiveById(schoolId, id);
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async create(schoolId: string, dto: CreateStudentDto) {
    const extraData = dto.extraData ?? {};
    await this.fields.validate(
      schoolId,
      extraData,
      Object.keys(dto.extraData ?? {}),
    );
    try {
      return await this.repository.create(schoolId, {
        ...dto,
        extraData: extraData as Prisma.InputJsonValue,
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(schoolId: string, id: string, dto: UpdateStudentDto) {
    const existing = await this.get(schoolId, id);
    const extraData = {
      ...(existing.extraData as Record<string, unknown>),
      ...(dto.extraData ?? {}),
    };
    await this.fields.validate(
      schoolId,
      extraData,
      Object.keys(dto.extraData ?? {}),
    );
    try {
      const updated = await this.repository.updateActive(schoolId, id, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.className !== undefined ? { className: dto.className } : {}),
        ...(dto.rollNo !== undefined ? { rollNo: dto.rollNo } : {}),
        ...(dto.extraData !== undefined
          ? { extraData: extraData as Prisma.InputJsonValue }
          : {}),
      });
      if (!updated) throw new NotFoundException('Student not found');
      return updated;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async remove(schoolId: string, id: string) {
    if (!(await this.repository.softDelete(schoolId, id)))
      throw new NotFoundException('Student not found');
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException(
        'A student with this class and roll number already exists',
      );
    throw error;
  }
}
