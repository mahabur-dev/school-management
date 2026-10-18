-- Finance is a developer-owned feature that remains disabled for each school
-- until the super admin explicitly grants access.
ALTER TYPE "feature_key" ADD VALUE IF NOT EXISTS 'FEE_MANAGEMENT';

CREATE TABLE "finance_settings" (
    "school_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BDT',
    "invoice_prefix" VARCHAR(20) NOT NULL DEFAULT 'INV',
    "payment_prefix" VARCHAR(20) NOT NULL DEFAULT 'PAY',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "finance_settings_pkey" PRIMARY KEY ("school_id")
);

ALTER TABLE "finance_settings"
ADD CONSTRAINT "finance_settings_school_id_fkey"
FOREIGN KEY ("school_id") REFERENCES "schools"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
