-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "class_name" VARCHAR(80) NOT NULL,
    "roll_no" VARCHAR(40) NOT NULL,
    "extra_data" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_school_id_class_name_idx" ON "students"("school_id", "class_name");

-- CreateIndex
CREATE INDEX "students_school_id_deleted_at_idx" ON "students"("school_id", "deleted_at");

-- Enforce roll uniqueness only among active (non-soft-deleted) students.
CREATE UNIQUE INDEX "students_school_class_roll_active_unique"
ON "students"("school_id", "class_name", "roll_no")
WHERE "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
