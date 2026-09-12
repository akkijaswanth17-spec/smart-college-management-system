const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ACADEMIC_YEAR = "2026-2027";

const FACULTY = {
  IME_F: { facultyId: "2095", fullName: "Mr. Emmanuel", designation: "Lecturer" },
  BDCC_F: { facultyId: "1660", fullName: "Mr. S. Ravikanth", designation: "Lecturer" },
  AP_F: { facultyId: "2202", fullName: "Ms. Chandra Bhanu", designation: "Lecturer" },
  IOT_F: { facultyId: "1614", fullName: "Mr. Venu Babu", designation: "Lecturer" },
  PP_F: { facultyId: "2194", fullName: "Mr. SK. John Basha", designation: "Lecturer" },
  LS_F: { facultyId: "2201", fullName: "Mr. J. Venkateswara Rao", designation: "Lecturer" },
  SEM_F: { facultyId: "2130", fullName: "Mr. K.N.V.B.G. Pavan Kumar", designation: "Lecturer" },
};

const SUBJECTS = [
  { key: "IME", code: "CM-501", name: "Industrial Management and Entrepreneurship", facultyKey: "IME_F" },
  { key: "BDCC", code: "CM-502", name: "Big Data & Cloud Computing", facultyKey: "BDCC_F" },
  { key: "AP", code: "CM-503", name: "Android Programming", facultyKey: "AP_F" },
  { key: "IoT", code: "CM-504", name: "Internet Of Things", facultyKey: "IOT_F" },
  { key: "PP", code: "CM-505", name: "Python Programming", facultyKey: "PP_F" },
  { key: "AP LAB", code: "CM-506", name: "Android Programming Lab", facultyKey: "AP_F" },
  { key: "PPLAB", code: "CM-507", name: "Python Programming Lab", facultyKey: "PP_F" },
  { key: "LifeSkills", code: "CM-508", name: "Life Skills", facultyKey: "LS_F" },
  { key: "PROJECTWORK", code: "CM-509", name: "Project Work", facultyKey: "BDCC_F" },
  { key: "Seminar", code: "CM-510", name: "Seminar", facultyKey: "SEM_F" },
];

// day, startTime, endTime, subjectKey
const GRID = [
  // Monday
  ["MONDAY", "09:00", "10:00", "PP"],
  ["MONDAY", "10:00", "11:00", "IME"],
  ["MONDAY", "11:00", "12:00", "BDCC"],
  ["MONDAY", "12:40", "13:30", "AP"],
  ["MONDAY", "13:30", "14:20", "IoT"],
  ["MONDAY", "14:30", "15:20", "PP"],
  ["MONDAY", "15:20", "16:10", "BDCC"],
  // Tuesday
  ["TUESDAY", "09:00", "10:00", "IME"],
  ["TUESDAY", "10:00", "11:00", "IoT"],
  ["TUESDAY", "11:00", "12:00", "AP"],
  ["TUESDAY", "12:40", "13:30", "PP"],
  ["TUESDAY", "13:30", "15:20", "AP LAB"],
  // Wednesday
  ["WEDNESDAY", "09:00", "10:00", "AP"],
  ["WEDNESDAY", "10:00", "11:00", "LifeSkills"],
  ["WEDNESDAY", "11:00", "12:00", "Seminar"],
  ["WEDNESDAY", "12:40", "13:30", "IME"],
  ["WEDNESDAY", "13:30", "14:20", "BDCC"],
  ["WEDNESDAY", "14:30", "15:20", "AP"],
  ["WEDNESDAY", "15:20", "16:10", "IoT"],
  // Thursday
  ["THURSDAY", "09:00", "10:00", "IoT"],
  ["THURSDAY", "10:00", "11:00", "BDCC"],
  ["THURSDAY", "11:00", "12:00", "IME"],
  ["THURSDAY", "12:40", "13:30", "AP"],
  ["THURSDAY", "13:30", "14:20", "BDCC"],
  ["THURSDAY", "14:30", "15:20", "PP"],
  ["THURSDAY", "15:20", "16:10", "Seminar"],
  // Friday
  ["FRIDAY", "09:00", "12:00", "PROJECTWORK"],
  ["FRIDAY", "12:40", "13:30", "AP"],
  ["FRIDAY", "13:30", "14:20", "IME"],
  ["FRIDAY", "14:30", "15:20", "LifeSkills"],
  ["FRIDAY", "15:20", "16:10", "PP"],
  // Saturday
  ["SATURDAY", "09:00", "12:00", "PPLAB"],
  ["SATURDAY", "12:40", "13:30", "IoT"],
  ["SATURDAY", "13:30", "14:20", "PP"],
  ["SATURDAY", "14:30", "15:20", "BDCC"],
  ["SATURDAY", "15:20", "16:10", "LifeSkills"],
];

async function main() {
  console.log("Importing DCME III/V Sem A timetable...");

  const dept = await prisma.department.upsert({
    where: { code: "DCME" },
    update: {},
    create: { name: "Diploma in Computer Engineering", code: "DCME" },
  });

  const block = await prisma.block.upsert({
    where: { name: "Main Block" },
    update: {},
    create: { name: "Main Block" },
  });
  const room = await prisma.room.upsert({
    where: { number_blockId: { number: "DCME-301", blockId: block.id } },
    update: {},
    create: { number: "DCME-301", blockId: block.id },
  });

  const facultyIdByKey = {};
  for (const [key, f] of Object.entries(FACULTY)) {
    const email = `${f.facultyId}@mictech.ac.in`;
    const existing = await prisma.faculty.findUnique({ where: { facultyId: f.facultyId } });
    if (existing) {
      facultyIdByKey[key] = existing.id;
      continue;
    }
    const passwordHash = await bcrypt.hash(`Faculty@${f.facultyId}`, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "FACULTY",
        mustChangePassword: true,
        faculty: {
          create: {
            facultyId: f.facultyId,
            fullName: f.fullName,
            phone: "9000000000",
            departmentId: dept.id,
            designation: f.designation,
          },
        },
      },
      include: { faculty: true },
    });
    facultyIdByKey[key] = user.faculty.id;
    console.log(`Created faculty ${f.fullName} (${email}) — temp password: Faculty@${f.facultyId}`);
  }

  const subjectIdByKey = {};
  for (const s of SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: { name: s.name, code: s.code, departmentId: dept.id },
    });
    subjectIdByKey[s.key] = { id: subject.id, facultyId: facultyIdByKey[s.facultyKey] };
  }

  // Clear any previous import of this exact class before re-inserting, so this script is safely re-runnable.
  await prisma.timetableEntry.deleteMany({
    where: { departmentId: dept.id, year: 3, section: "A", academicYear: ACADEMIC_YEAR },
  });

  let created = 0;
  for (const [day, startTime, endTime, subjectKey] of GRID) {
    const subj = subjectIdByKey[subjectKey];
    if (!subj) {
      console.error(`Unknown subject key: ${subjectKey}`);
      continue;
    }
    await prisma.timetableEntry.create({
      data: {
        facultyId: subj.facultyId,
        subjectId: subj.id,
        departmentId: dept.id,
        year: 3,
        section: "A",
        day,
        startTime,
        endTime,
        roomId: room.id,
        blockId: block.id,
        academicYear: ACADEMIC_YEAR,
      },
    });
    created++;
  }

  console.log(`\nDone. Created ${created} timetable entries for DCME, Year 3, Section A, ${ACADEMIC_YEAR}.`);
  console.log("Class Incharge (for reference): Mr. SK. John Basha");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
