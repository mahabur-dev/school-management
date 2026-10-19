-- RenameForeignKey
ALTER TABLE "fee_structure_items" RENAME CONSTRAINT "fee_structure_items_category_same_school_fkey" TO "fee_structure_items_school_id_fee_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "fee_structure_items" RENAME CONSTRAINT "fee_structure_items_structure_same_school_fkey" TO "fee_structure_items_school_id_fee_structure_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoice_items" RENAME CONSTRAINT "invoice_items_category_same_school_fkey" TO "invoice_items_school_id_fee_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoice_items" RENAME CONSTRAINT "invoice_items_invoice_same_school_fkey" TO "invoice_items_school_id_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_creator_same_school_fkey" TO "invoices_school_id_created_by_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_structure_same_school_fkey" TO "invoices_school_id_fee_structure_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "invoices_student_same_school_fkey" TO "invoices_school_id_student_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_allocations" RENAME CONSTRAINT "payment_allocations_invoice_same_school_fkey" TO "payment_allocations_school_id_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_allocations" RENAME CONSTRAINT "payment_allocations_payment_same_school_fkey" TO "payment_allocations_school_id_payment_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_allocations" RENAME CONSTRAINT "payment_allocations_school_fkey" TO "payment_allocations_school_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_reversals" RENAME CONSTRAINT "payment_reversals_payment_same_school_fkey" TO "payment_reversals_school_id_payment_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_reversals" RENAME CONSTRAINT "payment_reversals_reverser_same_school_fkey" TO "payment_reversals_school_id_reversed_by_fkey";

-- RenameForeignKey
ALTER TABLE "payment_reversals" RENAME CONSTRAINT "payment_reversals_school_fkey" TO "payment_reversals_school_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_sequences" RENAME CONSTRAINT "payment_sequences_school_fkey" TO "payment_sequences_school_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_recorder_same_school_fkey" TO "payments_school_id_recorded_by_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_school_fkey" TO "payments_school_id_fkey";

-- RenameIndex
ALTER INDEX "fee_structure_items_category_once_per_structure_key" RENAME TO "fee_structure_items_school_id_fee_structure_id_fee_category_key";

-- RenameIndex
ALTER INDEX "payment_allocations_once_key" RENAME TO "payment_allocations_school_id_payment_id_invoice_id_key";
