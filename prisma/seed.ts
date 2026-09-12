/**
 * Development-only seed data.
 * These credentials are for local development ONLY — never use them in production.
 *
 * Run with: npm run seed (from backend/)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hash(pw: string) {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

async function main() {
  console.log("Seeding database...");

  // ---------- Departments ----------
  const [cse, ece, mech] = await Promise.all([
    prisma.department.upsert({
      where: { code: "CSE" },
      update: {},
      create: { name: "Computer Science & Engineering", code: "CSE" },
    }),
    prisma.department.upsert({
      where: { code: "ECE" },
      update: {},
      create: { name: "Electronics & Communication Engineering", code: "ECE" },
    }),
    prisma.department.upsert({
      where: { code: "MECH" },
      update: {},
      create: { name: "Mechanical Engineering", code: "MECH" },
    }),
  ]);

  // ---------- Blocks & Rooms ----------
  const blockA = await prisma.block.upsert({ where: { name: "A Block" }, update: {}, create: { name: "A Block" } });
  const blockB = await prisma.block.upsert({ where: { name: "B Block" }, update: {}, create: { name: "B Block" } });

  const room204 = await prisma.room.upsert({
    where: { number_blockId: { number: "204", blockId: blockA.id } },
    update: {},
    create: { number: "204", blockId: blockA.id },
  });
  const room305 = await prisma.room.upsert({
    where: { number_blockId: { number: "305", blockId: blockB.id } },
    update: {},
    create: { number: "305", blockId: blockB.id },
  });

  // ---------- Subjects ----------
  const dbms = await prisma.subject.upsert({
    where: { code: "CSE-DBMS" },
    update: {},
    create: { name: "Database Management Systems", code: "CSE-DBMS", departmentId: cse.id },
  });
  const os = await prisma.subject.upsert({
    where: { code: "CSE-OS" },
    update: {},
    create: { name: "Operating Systems", code: "CSE-OS", departmentId: cse.id },
  });
  const dsp = await prisma.subject.upsert({
    where: { code: "ECE-DSP" },
    update: {},
    create: { name: "Digital Signal Processing", code: "ECE-DSP", departmentId: ece.id },
  });

  // ---------- Admin ----------
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@smartcollege.dev" },
    update: {},
    create: {
      email: "admin@smartcollege.dev",
      passwordHash: await hash("Admin@12345"),
      role: "ADMIN",
      admin: { create: { fullName: "System Administrator" } },
    },
  });

  // ---------- Faculty ----------
  const facultySeeds = [
    {
      email: "faculty1@smartcollege.dev",
      facultyId: "FAC001",
      fullName: "Dr. Ramesh Kumar",
      phone: "9000000001",
      departmentId: cse.id,
      designation: "Associate Professor",
    },
    {
      email: "faculty2@smartcollege.dev",
      facultyId: "FAC002",
      fullName: "Dr. Priya Sharma",
      phone: "9000000002",
      departmentId: cse.id,
      designation: "Assistant Professor",
    },
    {
      email: "faculty3@smartcollege.dev",
      facultyId: "FAC003",
      fullName: "Dr. Anil Nair",
      phone: "9000000003",
      departmentId: ece.id,
      designation: "Professor",
    },
  ];

  const facultyRecords = [];
  for (const f of facultySeeds) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: {},
      create: {
        email: f.email,
        passwordHash: await hash("Faculty@12345"),
        role: "FACULTY",
        faculty: {
          create: {
            facultyId: f.facultyId,
            fullName: f.fullName,
            phone: f.phone,
            departmentId: f.departmentId,
            designation: f.designation,
          },
        },
      },
      include: { faculty: true },
    });
    facultyRecords.push(user.faculty!);
  }

  // ---------- Students ----------
  const studentSeeds = [
    { email: "student1@smartcollege.dev", studentId: "STU001", fullName: "Aarav Mehta", year: 2, section: "A" },
    { email: "student2@smartcollege.dev", studentId: "STU002", fullName: "Diya Patel", year: 2, section: "A" },
    { email: "student3@smartcollege.dev", studentId: "STU003", fullName: "Kabir Singh", year: 3, section: "B" },
    { email: "student4@smartcollege.dev", studentId: "STU004", fullName: "Ananya Rao", year: 1, section: "A" },
    { email: "student5@smartcollege.dev", studentId: "STU005", fullName: "Vihaan Joshi", year: 3, section: "B" },
  ];

  const studentRecords = [];
  for (const s of studentSeeds) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: await hash("Student@12345"),
        role: "STUDENT",
        student: {
          create: {
            studentId: s.studentId,
            fullName: s.fullName,
            phone: "9111100000",
            departmentId: cse.id,
            year: s.year,
            section: s.section,
          },
        },
      },
      include: { student: true },
    });
    studentRecords.push(user.student!);
  }

  // ---------- Notices ----------
  await prisma.notice.createMany({
    data: [
      {
        title: "Semester Examination Schedule Released",
        description: "The end-semester examination timetable has been published. Check the academic updates section for your department-wise schedule.",
        category: "EXAMINATION",
        priority: "HIGH",
        isPublished: true,
        publishedDate: new Date(),
        createdById: adminUser.id,
      },
      {
        title: "Annual Tech Fest — Registrations Open",
        description: "Registrations for the annual technical fest are now open. Visit the student affairs office for details.",
        category: "EVENTS",
        priority: "NORMAL",
        isPublished: true,
        publishedDate: new Date(),
        createdById: adminUser.id,
      },
      {
        title: "Campus Closed — Public Holiday",
        description: "The campus will remain closed on account of a public holiday. Regular classes resume the following day.",
        category: "HOLIDAY",
        priority: "NORMAL",
        isPublished: true,
        publishedDate: new Date(),
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  // ---------- Academic Updates ----------
  await prisma.academicUpdate.createMany({
    data: [
      {
        title: "Internal Assessment 2 — Schedule",
        description: "Internal Assessment 2 for all CSE second-year sections will be conducted next week.",
        departmentId: cse.id,
        year: 2,
        section: "A",
        category: "INTERNAL_ASSESSMENT",
        date: new Date(),
        createdById: adminUser.id,
      },
      {
        title: "Assignment 3 Deadline",
        description: "Submit Assignment 3 for Database Management Systems before the deadline via the department portal.",
        departmentId: cse.id,
        year: 2,
        section: "A",
        category: "ASSIGNMENT",
        date: new Date(),
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  // ---------- Lost & Found ----------
  await prisma.lostFoundItem.createMany({
    data: [
      {
        itemName: "Black Wallet",
        description: "Lost near the library entrance. Contains a college ID card.",
        type: "LOST",
        status: "LOST",
        location: "Library Entrance",
        date: new Date(),
        contactInfo: "9111100000",
        createdById: studentRecords[0] ? adminUser.id : adminUser.id,
      },
      {
        itemName: "Blue Water Bottle",
        description: "Found in classroom 204, A Block after Database Management Systems class.",
        type: "FOUND",
        status: "FOUND",
        location: "Room 204, A Block",
        date: new Date(),
        contactInfo: "9111100001",
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  // ---------- Timetable ----------
  const academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  await prisma.timetableEntry.createMany({
    data: [
      {
        facultyId: facultyRecords[0].id,
        subjectId: dbms.id,
        departmentId: cse.id,
        year: 2,
        section: "A",
        day: "MONDAY",
        startTime: "10:00",
        endTime: "11:00",
        roomId: room204.id,
        blockId: blockA.id,
        academicYear,
      },
      {
        facultyId: facultyRecords[1].id,
        subjectId: os.id,
        departmentId: cse.id,
        year: 2,
        section: "A",
        day: "MONDAY",
        startTime: "11:00",
        endTime: "12:00",
        roomId: room305.id,
        blockId: blockB.id,
        academicYear,
      },
      {
        facultyId: facultyRecords[2].id,
        subjectId: dsp.id,
        departmentId: ece.id,
        year: 3,
        section: "B",
        day: "TUESDAY",
        startTime: "09:00",
        endTime: "10:00",
        roomId: room305.id,
        blockId: blockB.id,
        academicYear,
      },
    ],
    skipDuplicates: true,
  });

  // ---------- Settings ----------
  await prisma.setting.upsert({
    where: { key: "fee_payment_url" },
    update: {},
    create: { key: "fee_payment_url", value: "https://example-college-fees.edu/pay", updatedById: adminUser.id },
  });
  await prisma.setting.upsert({
    where: { key: "results_url" },
    update: {},
    create: { key: "results_url", value: "https://example-college-results.edu", updatedById: adminUser.id },
  });

  // ---------- WhatsApp Groups ----------
  await prisma.whatsAppGroup.createMany({
    data: [
      {
        name: "CSE 2nd Year Section A",
        subject: "Database Management Systems",
        department: "CSE",
        year: 2,
        section: "A",
        inviteLink: "https://chat.whatsapp.com/EXAMPLE_INVITE_LINK_1",
      },
      {
        name: "ECE 3rd Year Section B",
        subject: "Digital Signal Processing",
        department: "ECE",
        year: 3,
        section: "B",
        inviteLink: "https://chat.whatsapp.com/EXAMPLE_INVITE_LINK_2",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete.\n");
  console.log("=== DEV-ONLY DEMO CREDENTIALS (do NOT use in production) ===");
  console.log("Admin:    admin@smartcollege.dev / Admin@12345");
  console.log("Faculty:  faculty1@smartcollege.dev / Faculty@12345  (also faculty2, faculty3)");
  console.log("Student:  student1@smartcollege.dev / Student@12345  (also student2..student5)");
  console.log("==============================================================\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
