// One-off cleanup: permanently removes every current student and faculty
// account (and the records that reference them) so the admin can start
// fresh with newly created accounts. Run once with: node scripts/remove-all-students-faculty.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({ select: { id: true, userId: true, fullName: true, studentId: true } });
  const faculty = await prisma.faculty.findMany({ select: { id: true, userId: true, fullName: true, facultyId: true } });

  const studentIds = students.map((s) => s.id);
  const facultyIds = faculty.map((f) => f.id);
  const allUserIds = [...students.map((s) => s.userId), ...faculty.map((f) => f.userId)];

  console.log(`Found ${students.length} student(s) and ${faculty.length} faculty member(s) to remove.`);
  students.forEach((s) => console.log(`  student: ${s.fullName} (${s.studentId})`));
  faculty.forEach((f) => console.log(`  faculty: ${f.fullName} (${f.facultyId})`));

  if (allUserIds.length === 0) {
    console.log("Nothing to remove.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Clear rows that RESTRICT deletion of the users/faculty above.
    // (class_reminders cascade automatically when their timetable_entries are deleted.)
    const timetable = await tx.timetableEntry.deleteMany({ where: { facultyId: { in: facultyIds } } });
    const whatsapp = await tx.whatsAppRequest.deleteMany({ where: { studentId: { in: studentIds } } });
    const lostFound = await tx.lostFoundItem.deleteMany({ where: { createdById: { in: allUserIds } } });
    const notices = await tx.notice.deleteMany({ where: { createdById: { in: allUserIds } } });
    const updates = await tx.academicUpdate.deleteMany({ where: { createdById: { in: allUserIds } } });

    // Deleting the users cascades to their student/faculty/notification/
    // password-reset rows, and nulls out any audit_log entries they made
    // (the audit trail itself is preserved).
    const users = await tx.user.deleteMany({ where: { id: { in: allUserIds } } });

    console.log("\nRemoved:");
    console.log(`  ${timetable.count} timetable entr${timetable.count === 1 ? "y" : "ies"}`);
    console.log(`  ${whatsapp.count} WhatsApp request(s)`);
    console.log(`  ${lostFound.count} lost & found post(s)`);
    console.log(`  ${notices.count} notice(s)`);
    console.log(`  ${updates.count} academic update(s)`);
    console.log(`  ${users.count} user account(s) (students + faculty)`);
  });

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
