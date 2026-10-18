import { Module } from '@nestjs/common';
import { FeaturesModule } from '../features/features.module';
import { StudentsModule } from '../students/students.module';
import { FeeCategoriesController } from './fee-categories.controller';
import { FeeStructuresController } from './fee-structures.controller';
import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';
import { InvoiceFieldValidationService } from './invoice-field-validation.service';
import { InvoiceBalancesService } from './invoice-balances.service';
import { InvoiceDocumentService } from './invoice-document.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StudentFinanceController } from './student-finance.controller';
import { StudentFinanceService } from './student-finance.service';

@Module({
  imports: [FeaturesModule, StudentsModule],
  controllers: [
    FeeCategoriesController,
    FeeStructuresController,
    InvoicesController,
    PaymentsController,
    StudentFinanceController,
  ],
  providers: [
    FinanceRepository,
    FinanceService,
    InvoicesRepository,
    InvoicesService,
    InvoiceFieldValidationService,
    InvoiceBalancesService,
    InvoiceDocumentService,
    PaymentsService,
    StudentFinanceService,
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
