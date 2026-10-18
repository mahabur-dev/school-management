CREATE TYPE "fee_billing_frequency" AS ENUM ('MONTHLY', 'ONE_TIME');
CREATE TYPE "fee_structure_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TABLE "fee_categories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_categories_school_id_id_key" UNIQUE ("school_id", "id"),
    CONSTRAINT "fee_categories_school_id_code_key" UNIQUE ("school_id", "code")
);

CREATE TABLE "fee_structures" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "class_name" VARCHAR(80) NOT NULL,
    "academic_year" VARCHAR(30) NOT NULL,
    "billing_frequency" "fee_billing_frequency" NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "status" "fee_structure_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_structures_school_id_id_key" UNIQUE ("school_id", "id"),
    CONSTRAINT "fee_structures_effective_dates_check" CHECK ("effective_until" IS NULL OR "effective_until" >= "effective_from")
);

CREATE TABLE "fee_structure_items" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "fee_structure_id" UUID NOT NULL,
    "fee_category_id" UUID NOT NULL,
    "description" TEXT,
    "amount_minor" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fee_structure_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_structure_items_school_id_id_key" UNIQUE ("school_id", "id"),
    CONSTRAINT "fee_structure_items_category_once_per_structure_key" UNIQUE ("school_id", "fee_structure_id", "fee_category_id"),
    CONSTRAINT "fee_structure_items_amount_positive_check" CHECK ("amount_minor" > 0)
);

CREATE INDEX "fee_categories_school_id_is_active_idx" ON "fee_categories"("school_id", "is_active");
CREATE INDEX "fee_structures_school_id_status_idx" ON "fee_structures"("school_id", "status");
CREATE INDEX "fee_structures_school_id_class_name_academic_year_idx" ON "fee_structures"("school_id", "class_name", "academic_year");
CREATE INDEX "fee_structure_items_school_id_fee_category_id_idx" ON "fee_structure_items"("school_id", "fee_category_id");

ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_structure_same_school_fkey" FOREIGN KEY ("school_id", "fee_structure_id") REFERENCES "fee_structures"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_category_same_school_fkey" FOREIGN KEY ("school_id", "fee_category_id") REFERENCES "fee_categories"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
