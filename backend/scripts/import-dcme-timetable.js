// Imports the real III DCME / V SEM A timetable (DCME-F014 photo) into the system.
// DCME maps to the existing CSE department. Room/Block are not shown on the timetable
// photo, so this uses an explicit "Not Specified" placeholder — update via Room
// Management once the real room is known; it is never presented as real data.
//
// Run AFTER backend/scripts/create-dcme-timetable-faculty.js (this script expects the
// 7 faculty accounts to already exist and will fail loudly if any are missing, rather
// than silently creating duplicate accounts with a different, weaker password scheme).
//
// Run against production: node backend/scripts/import-dcme-timetable.js

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const envProdPath = path.join(__dirname, "../deploy/.env.production");
const envProd = fs.readFileSync(envProdPath, "utf8");
const match = envProd.match(/^DATABASE_URL="(.*)"$/m);
if (!match) throw new Error("Could not find DATABASE_URL in backend/deploy/.env.production");
const DATABASE_URL = match[1];

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

const DEPARTMENT_CODE = "CSE";
const ACADEMIC_YEAR = "2026-2027";
const YEAR = 3;
const SECTION = "A";

// facultyId -> subject key, from the real timetable photo.
const FACULTY_IDS = {
  IME_F: "2095",
  BDCC_F: "1660",
  AP_F: "2202",
  IOT_F: "1614",
  PP_F: "2194",
  LS_F: "2201",
  SEM_F: "2130",
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

// day, startTime, endTime, subjectKey — transcribed directly from the timetable photo.
const GRID = [
  ["MONDAY", "09:00", "10:00", "PP"],
  ["MONDAY", "10:00", "11:00", "IME"],
  ["MONDAY", "11:00", "12:00", "BDCC"],
  ["MONDAY", "12:40", "13:30", "AP"],
  ["MONDAY", "13:30", "14:20", "IoT"],
  ["MONDAY", "14:30", "15:20", "PP"],
  ["MONDAY", "15:20", "16:10", "BDCC"],
  ["TUESDAY", "09:00", "10:00", "IME"],
  ["TUESDAY", "10:00", "11:00", "IoT"],
  ["TUESDAY", "11:00", "12:00", "AP"],
  ["TUESDAY", "12:40", "13:30", "PP"],
  ["TUESDAY", "13:30", "15:20", "AP LAB"],
  ["WEDNESDAY", "09:00", "10:00", "AP"],
  ["WEDNESDAY", "10:00", "11:00", "LifeSkills"],
  ["WEDNESDAY", "11:00", "12:00", "Seminar"],
  ["WEDNESDAY", "12:40", "13:30", "IME"],
  ["WEDNESDAY", "13:30", "14:20", "BDCC"],
  ["WEDNESDAY", "14:30", "15:20", "AP"],
  ["WEDNESDAY", "15:20", "16:10", "IoT"],
  ["THURSDAY", "09:00", "10:00", "IoT"],
  ["THURSDAY", "10:00", "11:00", "BDCC"],
  ["THURSDAY", "11:00", "12:00", "IME"],
  ["THURSDAY", "12:40", "13:30", "AP"],
  ["THURSDAY", "13:30", "14:20", "BDCC"],
  ["THURSDAY", "14:30", "15:20", "PP"],
  ["THURSDAY", "15:20", "16:10", "Seminar"],
  ["FRIDAY", "09:00", "12:00", "PROJECTWORK"],
  ["FRIDAY", "12:40", "13:30", "AP"],
  ["FRIDAY", "13:30", "14:20", "IME"],
  ["FRIDAY", "14:30", "15:20", "LifeSkills"],
  ["FRIDAY", "15:20", "16:10", "PP"],
  ["SATURDAY", "09:00", "12:00", "PPLAB"],
  ["SATURDAY", "12:40", "13:30", "IoT"],
  ["SATURDAY", "13:30", "14:20", "PP"],
  ["SATURDAY", "14:30", "15:20", "BDCC"],
  ["SATURDAY", "15:20", "16:10", "LifeSkills"],
];

async function main() {
  console.log(`Importing III/V SEM A timetable into ${DEPARTMENT_CODE}...`);

  const dept = await prisma.department.findUnique({ where: { code: DEPARTMENT_CODE } });
  if (!dept) throw new Error(`Department ${DEPARTMENT_CODE} not found`);

  const block = await prisma.block.upsert({
    where: { name: "Not Specified" },
    update: {},
    create: { name: "Not Specified" },
  });
  const room = await prisma.room.upsert({
    where: { number_blockId: { number: "TBD", blockId: block.id } },
    update: {},
    create: { number: "TBD", blockId: block.id },
  });

  const facultyIdByKey = {};
  const missing = [];
  for (const [key, facultyId] of Object.entries(FACULTY_IDS)) {
    const faculty = await prisma.faculty.findUnique({ where: { facultyId } });
    if (!faculty) {
      missing.push(facultyId);
      continue;
    }
    facultyIdByKey[key] = faculty.id;
  }
  if (missing.length > 0) {
    throw new Error(
      `Faculty ID(s) not found: ${missing.join(", ")}. Run backend/scripts/create-dcme-timetable-faculty.js first.`
    );
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
    where: { departmentId: dept.id, year: YEAR, section: SECTION, academicYear: ACADEMIC_YEAR },
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
        year: YEAR,
        section: SECTION,
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

  console.log(`\nDone. Created ${created} timetable entries for ${DEPARTMENT_CODE}, Year ${YEAR}, Section ${SECTION}, ${ACADEMIC_YEAR}.`);
  console.log('Room/Block are placeholders ("TBD" / "Not Specified") — update via Room Management once known.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
