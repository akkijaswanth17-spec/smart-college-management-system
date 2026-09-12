-- AlterTable
ALTER TABLE "branch_admins" ADD COLUMN "branch_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "branch_admins_branch_id_key" ON "branch_admins"("branch_id");
