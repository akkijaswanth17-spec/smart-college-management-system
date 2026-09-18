-- CreateEnum
CREATE TYPE "StudyMaterialType" AS ENUM ('ASSIGNMENT', 'NOTES', 'QUESTION_BANK');

-- AlterTable
ALTER TABLE "notices" ADD COLUMN "department_id" TEXT;

-- CreateIndex
CREATE INDEX "notices_department_id_idx" ON "notices"("department_id");

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "study_materials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "StudyMaterialType" NOT NULL,
    "department_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_materials_department_id_type_idx" ON "study_materials"("department_id", "type");

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
