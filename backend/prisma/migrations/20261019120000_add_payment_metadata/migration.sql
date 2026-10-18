ALTER TABLE "payments"
ADD COLUMN "extra_data" JSONB NOT NULL DEFAULT '{}';
