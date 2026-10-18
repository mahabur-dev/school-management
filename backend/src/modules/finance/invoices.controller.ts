import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentSchool } from '../../common/decorators/current-school.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  RequestSchool,
  RequestUser,
} from '../../common/types/request-context.type';
import { FeatureKey, UserRole } from '../../prisma';
import { CreateInvoiceDto, UpdateDraftInvoiceDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';
import { InvoiceBalancesService } from './invoice-balances.service';
import { InvoiceDocumentService } from './invoice-document.service';
import { PaymentsService } from './payments.service';

@ApiTags('Finance · Invoices')
@ApiBearerAuth()
@Controller('finance/invoices')
@UseGuards(TenantGuard, FeatureGuard)
@RequireFeature(FeatureKey.FEE_MANAGEMENT)
@Roles(UserRole.SCHOOL_ADMIN)
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly balances: InvoiceBalancesService,
    private readonly documents: InvoiceDocumentService,
    private readonly paymentService: PaymentsService,
  ) {}
  @Get() list(@CurrentSchool() school: RequestSchool) {
    return this.invoices.list(school.id);
  }
  @Post() create(
    @CurrentSchool() school: RequestSchool,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoices.createDraft(school.id, user.id, dto);
  }
  @Get(':id') get(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoices.get(school.id, id);
  }
  @Get(':id/balance') balance(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.balances.get(school.id, id);
  }
  @Get(':id/pdf') async pdf(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const document = await this.documents.generate(school.id, id);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
      'Content-Length': String(document.buffer.length),
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(document.buffer);
  }
  @Get(':id/payments') payments(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.listForInvoice(school.id, id);
  }
  @Patch(':id') update(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDraftInvoiceDto,
  ) {
    return this.invoices.updateDraft(school.id, id, dto);
  }
  @Post(':id/issue') issue(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoices.issue(school.id, id);
  }
  @Post(':id/void') void(
    @CurrentSchool() school: RequestSchool,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoices.void(school.id, id);
  }
}
