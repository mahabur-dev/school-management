-- CreateEnum
CREATE TYPE "feature_key" AS ENUM ('STUDENT_MANAGEMENT');

-- CreateEnum
CREATE TYPE "feature_field_type" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT');

-- CreateTable
CREATE TABLE "features" (
    "id" UUID NOT NULL,
    "key" "feature_key" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_fields" (
    "id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "type" "feature_field_type" NOT NULL,
    "is_core" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feature_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_features" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "school_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_feature_fields" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "feature_field_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "school_feature_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "features_key_key" ON "features"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_fields_feature_id_key_key" ON "feature_fields"("feature_id", "key");

-- CreateIndex
CREATE INDEX "feature_fields_feature_id_sort_order_idx" ON "feature_fields"("feature_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "school_features_school_id_feature_id_key" ON "school_features"("school_id", "feature_id");

-- CreateIndex
CREATE INDEX "school_features_school_id_enabled_idx" ON "school_features"("school_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "school_feature_fields_school_id_feature_field_id_key" ON "school_feature_fields"("school_id", "feature_field_id");

-- CreateIndex
CREATE INDEX "school_feature_fields_school_id_enabled_idx" ON "school_feature_fields"("school_id", "enabled");

-- AddForeignKey
ALTER TABLE "feature_fields" ADD CONSTRAINT "feature_fields_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_features" ADD CONSTRAINT "school_features_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_features" ADD CONSTRAINT "school_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_feature_fields" ADD CONSTRAINT "school_feature_fields_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_feature_fields" ADD CONSTRAINT "school_feature_fields_feature_field_id_fkey" FOREIGN KEY ("feature_field_id") REFERENCES "feature_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
