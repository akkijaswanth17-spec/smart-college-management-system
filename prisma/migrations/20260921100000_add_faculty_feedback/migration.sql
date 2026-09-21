-- CreateTable
CREATE TABLE "feedback_questions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_submissions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_answers" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "feedback_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_publishes" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_publishes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_submissions_student_id_faculty_id_subject_id_aca_key" ON "feedback_submissions"("student_id", "faculty_id", "subject_id", "academic_year");

-- CreateIndex
CREATE INDEX "feedback_submissions_faculty_id_subject_id_department_id_y_idx" ON "feedback_submissions"("faculty_id", "subject_id", "department_id", "year", "section", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_answers_submission_id_question_id_key" ON "feedback_answers"("submission_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_publishes_department_id_year_section_academic_ye_key" ON "feedback_publishes"("department_id", "year", "section", "academic_year");

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "feedback_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "feedback_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_publishes" ADD CONSTRAINT "feedback_publishes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_publishes" ADD CONSTRAINT "feedback_publishes_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
