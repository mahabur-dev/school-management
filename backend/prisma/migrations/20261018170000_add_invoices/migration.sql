CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'ISSUED', 'VOID');

ALTER TABLE "students" ADD CONSTRAINT "students_school_id_id_key" UNIQUE ("school_id", "id");
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_id_key" UNIQUE ("school_id", "id");

CREATE TABLE "invoice_sequences" (
  "school_id" UUID NOT NULL, "year" INTEGER NOT NULL, "next_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("school_id", "year"),
  CONSTRAINT "invoice_sequences_year_check" CHECK ("year" BETWEEN 2000 AND 9999),
  CONSTRAINT "invoice_sequences_next_number_check" CHECK ("next_number" > 0)
);

CREATE TABLE "invoices" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "student_id" UUID NOT NULL, "fee_structure_id" UUID,
  "invoice_number" VARCHAR(60), "academic_year" VARCHAR(30) NOT NULL, "billing_period" DATE,
  "student_name_snapshot" VARCHAR(200), "class_name_snapshot" VARCHAR(100), "issue_date" DATE,
  "due_date" DATE NOT NULL, "currency" CHAR(3) NOT NULL DEFAULT 'BDT',
  "subtotal_minor" BIGINT NOT NULL DEFAULT 0, "discount_minor" BIGINT NOT NULL DEFAULT 0,
  "total_minor" BIGINT NOT NULL DEFAULT 0, "status" "invoice_status" NOT NULL DEFAULT 'DRAFT',
  "extra_data" JSONB NOT NULL DEFAULT '{}', "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"), CONSTRAINT "invoices_school_id_id_key" UNIQUE ("school_id", "id"),
  CONSTRAINT "invoices_school_id_invoice_number_key" UNIQUE ("school_id", "invoice_number"),
  CONSTRAINT "invoices_amount_check" CHECK ("subtotal_minor" >= 0 AND "discount_minor" >= 0 AND "discount_minor" <= "subtotal_minor" AND "total_minor" = "subtotal_minor" - "discount_minor"),
  CONSTRAINT "invoices_issue_check" CHECK ("status" = 'DRAFT' OR ("invoice_number" IS NOT NULL AND "issue_date" IS NOT NULL AND "student_name_snapshot" IS NOT NULL AND "class_name_snapshot" IS NOT NULL))
);

CREATE TABLE "invoice_items" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "invoice_id" UUID NOT NULL, "fee_category_id" UUID NOT NULL,
  "description" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1, "unit_amount_minor" BIGINT NOT NULL, "line_total_minor" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id"), CONSTRAINT "invoice_items_school_id_id_key" UNIQUE ("school_id", "id"),
  CONSTRAINT "invoice_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "invoice_items_amount_check" CHECK ("unit_amount_minor" > 0 AND "line_total_minor" = "quantity" * "unit_amount_minor")
);

CREATE INDEX "invoices_school_id_student_id_idx" ON "invoices"("school_id", "student_id");
CREATE INDEX "invoices_school_id_status_idx" ON "invoices"("school_id", "status");
CREATE INDEX "invoices_school_id_due_date_idx" ON "invoices"("school_id", "due_date");
CREATE INDEX "invoices_school_id_billing_period_idx" ON "invoices"("school_id", "billing_period");
CREATE INDEX "invoice_items_school_id_fee_category_id_idx" ON "invoice_items"("school_id", "fee_category_id");
CREATE UNIQUE INDEX "invoices_monthly_structure_once_active_idx" ON "invoices"("school_id", "student_id", "fee_structure_id", "billing_period") WHERE "fee_structure_id" IS NOT NULL AND "billing_period" IS NOT NULL AND "status" <> 'VOID';

ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_same_school_fkey" FOREIGN KEY ("school_id", "student_id") REFERENCES "students"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_structure_same_school_fkey" FOREIGN KEY ("school_id", "fee_structure_id") REFERENCES "fee_structures"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_creator_same_school_fkey" FOREIGN KEY ("school_id", "created_by") REFERENCES "users"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_same_school_fkey" FOREIGN KEY ("school_id", "invoice_id") REFERENCES "invoices"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_category_same_school_fkey" FOREIGN KEY ("school_id", "fee_category_id") REFERENCES "fee_categories"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
