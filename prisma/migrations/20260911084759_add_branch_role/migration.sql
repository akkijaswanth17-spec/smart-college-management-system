-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BRANCH';

-- CreateTable
CREATE TABLE "branch_admins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_admins_user_id_key" ON "branch_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_admins_department_id_key" ON "branch_admins"("department_id");

-- AddForeignKey
ALTER TABLE "branch_admins" ADD CONSTRAINT "branch_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_admins" ADD CONSTRAINT "branch_admins_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
