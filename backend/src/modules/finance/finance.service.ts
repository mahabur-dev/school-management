import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeeStructureStatus, Prisma } from '../../prisma';
import {
  CreateFeeCategoryDto,
  UpdateFeeCategoryDto,
} from './dto/fee-category.dto';
import { CreateFeeStructureDto } from './dto/fee-structure.dto';
import { FinanceRepository } from './finance.repository';

@Injectable()
export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  listCategories(schoolId: string) {
    return this.repository.listCategories(schoolId);
  }

  async getCategory(schoolId: string, id: string) {
    const category = await this.repository.findCategory(schoolId, id);
    if (!category) throw new NotFoundException('Fee category not found');
    return category;
  }

  async createCategory(schoolId: string, dto: CreateFeeCategoryDto) {
    try {
      return await this.repository.createCategory(schoolId, {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
      });
    } catch (error) {
      this.rethrowUnique(error, 'A fee category with this code already exists');
    }
  }

  async updateCategory(
    schoolId: string,
    id: string,
    dto: UpdateFeeCategoryDto,
  ) {
    await this.getCategory(schoolId, id);
    await this.repository.updateCategory(schoolId, id, dto);
    return this.getCategory(schoolId, id);
  }

  async updateCategoryStatus(schoolId: string, id: string, isActive: boolean) {
    await this.getCategory(schoolId, id);
    await this.repository.updateCategory(schoolId, id, { isActive });
    return this.getCategory(schoolId, id);
  }

  async listStructures(schoolId: string) {
    return (await this.repository.listStructures(schoolId)).map(
      toStructureResponse,
    );
  }

  async getStructure(schoolId: string, id: string) {
    const structure = await this.repository.findStructure(schoolId, id);
    if (!structure) throw new NotFoundException('Fee structure not found');
    return toStructureResponse(structure);
  }

  async createStructure(schoolId: string, dto: CreateFeeStructureDto) {
    const items = await this.resolveItems(schoolId, dto);
    const structure = await this.repository.createStructure(schoolId, {
      name: dto.name,
      className: dto.className,
      academicYear: dto.academicYear,
      billingFrequency: dto.billingFrequency,
      effectiveFrom: toDate(dto.effectiveFrom),
      effectiveUntil: dto.effectiveUntil ? toDate(dto.effectiveUntil) : null,
      items: { createMany: { data: items } },
    });
    return toStructureResponse(structure);
  }

  async updateDraftStructure(
    schoolId: string,
    id: string,
    dto: CreateFeeStructureDto,
  ) {
    await this.getStructure(schoolId, id);
    const items = await this.resolveItems(schoolId, dto);
    const updated = await this.repository.replaceDraftStructure(
      schoolId,
      id,
      {
        name: dto.name,
        className: dto.className,
        academicYear: dto.academicYear,
        billingFrequency: dto.billingFrequency,
        effectiveFrom: toDate(dto.effectiveFrom),
        effectiveUntil: dto.effectiveUntil ? toDate(dto.effectiveUntil) : null,
      },
      items,
    );
    if (!updated)
      throw new ConflictException('Only draft fee structures can be edited');
    return toStructureResponse(updated);
  }

  async activateStructure(schoolId: string, id: string) {
    const structure = await this.getStructure(schoolId, id);
    if (structure.status !== FeeStructureStatus.DRAFT) {
      throw new ConflictException('Only draft fee structures can be activated');
    }
    if (structure.items.length === 0)
      throw new ConflictException(
        'A fee structure needs at least one item before activation',
      );
    const result = await this.repository.transitionStructure(
      schoolId,
      id,
      FeeStructureStatus.DRAFT,
      FeeStructureStatus.ACTIVE,
    );
    if (!result.count)
      throw new ConflictException(
        'Fee structure state changed; refresh and try again',
      );
    return this.getStructure(schoolId, id);
  }

  async archiveStructure(schoolId: string, id: string) {
    const structure = await this.getStructure(schoolId, id);
    if (structure.status === FeeStructureStatus.ARCHIVED) return structure;
    const result = await this.repository.transitionStructure(
      schoolId,
      id,
      structure.status,
      FeeStructureStatus.ARCHIVED,
    );
    if (!result.count)
      throw new ConflictException(
        'Fee structure state changed; refresh and try again',
      );
    return this.getStructure(schoolId, id);
  }

  private async resolveItems(schoolId: string, dto: CreateFeeStructureDto) {
    const ids = dto.items.map((item) => item.feeCategoryId);
    if (new Set(ids).size !== ids.length)
      throw new ConflictException(
        'A fee category can only appear once in a fee structure',
      );
    if (
      dto.effectiveUntil &&
      toDate(dto.effectiveUntil) < toDate(dto.effectiveFrom)
    ) {
      throw new ConflictException(
        'Effective until must not be before effective from',
      );
    }
    const categories = await this.repository.findActiveCategories(
      schoolId,
      ids,
    );
    if (categories.length !== ids.length)
      throw new NotFoundException('One or more fee categories are unavailable');
    return dto.items.map((item) => ({
      feeCategoryId: item.feeCategoryId,
      description: item.description,
      amountMinor: BigInt(item.amountMinor),
    }));
  }

  private rethrowUnique(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException(message);
    throw error;
  }
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toStructureResponse<
  T extends { items: Array<{ amountMinor: bigint }> },
>(structure: T) {
  return {
    ...structure,
    items: structure.items.map((item) => ({
      ...item,
      amountMinor: item.amountMinor.toString(),
    })),
  };
}
