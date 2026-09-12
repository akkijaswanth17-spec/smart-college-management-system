/**
 * Integration tests for timetable conflict prevention and the reminder
 * pipeline, against the real database.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/config/prisma";
import { assertNoTimetableConflict } from "../../src/services/timetable.service";
import { runReminderCheck } from "../../src/services/reminder.service";
import { hashPassword } from "../../src/utils/password";
import { DateTime } from "luxon";
import { env } from "../../src/config/env";

const suffix = Date.now();
let departmentId: string;
let subjectId: string;
let blockId: string;
let roomId: string;
let facultyId: string;
let facultyUserId: string;
let timetableEntryId: string;

beforeAll(async () => {
  const dept = await prisma.department.upsert({
    where: { code: "TESTTT" },
    update: {},
    create: { name: "Timetable Test Dept", code: "TESTTT" },
  });
  departmentId = dept.id;

  const subject = await prisma.subject.create({
    data: { name: `Test Subject ${suffix}`, code: `TT-${suffix}`, departmentId },
  });
  subjectId = subject.id;

  const block = await prisma.block.upsert({ where: { name: "Test Block" }, update: {}, create: { name: "Test Block" } });
  blockId = block.id;

  const room = await prisma.room.create({ data: { number: `T-${suffix}`, blockId } });
  roomId = room.id;

  const facultyUser = await prisma.user.create({
    data: {
      email: `test.faculty.${suffix}@example.edu`,
      passwordHash: await hashPassword("Password123"),
      role: "FACULTY",
      faculty: {
        create: {
          facultyId: `TESTFAC${suffix}`,
          fullName: "Test Faculty",
          phone: "9000000000",
          departmentId,
          designation: "Tester",
        },
      },
    },
    include: { faculty: true },
  });
  facultyUserId = facultyUser.id;
  facultyId = facultyUser.faculty!.id;

  const entry = await prisma.timetableEntry.create({
    data: {
      facultyId,
      subjectId,
      departmentId,
      year: 1,
      section: "A",
      day: "MONDAY",
      startTime: "10:00",
      endTime: "11:00",
      roomId,
      blockId,
      academicYear: "2099-2100",
    },
  });
  timetableEntryId = entry.id;
});

afterAll(async () => {
  await prisma.classReminder.deleteMany({ where: { timetableEntryId } });
  await prisma.timetableEntry.deleteMany({ where: { id: timetableEntryId } });
  await prisma.user.deleteMany({ where: { id: facultyUserId } });
  await prisma.room.deleteMany({ where: { id: roomId } });
  await prisma.subject.deleteMany({ where: { id: subjectId } });
  await prisma.block.deleteMany({ where: { id: blockId } });
  await prisma.department.deleteMany({ where: { code: "TESTTT" } });
  await prisma.$disconnect();
});

describe("Timetable conflict prevention", () => {
  it("rejects a second class for the same faculty at an overlapping time", async () => {
    await expect(
      assertNoTimetableConflict({
        facultyId,
        roomId: "some-other-room-id",
        day: "MONDAY",
        startTime: "10:30",
        endTime: "11:30",
        academicYear: "2099-2100",
      })
    ).rejects.toThrow(/already assigned/i);
  });

  it("rejects a second class in the same room at an overlapping time (unless explicitly allowed)", async () => {
    await expect(
      assertNoTimetableConflict({
        facultyId: "some-other-faculty-id",
        roomId,
        day: "MONDAY",
        startTime: "10:30",
        endTime: "11:30",
        academicYear: "2099-2100",
      })
    ).rejects.toThrow(/already booked/i);
  });

  it("allows a room double-booking when explicitly permitted", async () => {
    await expect(
      assertNoTimetableConflict({
        facultyId: "some-other-faculty-id",
        roomId,
        day: "MONDAY",
        startTime: "10:30",
        endTime: "11:30",
        academicYear: "2099-2100",
        allowRoomConflict: true,
      })
    ).resolves.not.toThrow();
  });

  it("allows a non-overlapping (back-to-back) class for the same faculty and room", async () => {
    await expect(
      assertNoTimetableConflict({
        facultyId,
        roomId,
        day: "MONDAY",
        startTime: "11:00",
        endTime: "12:00",
        academicYear: "2099-2100",
      })
    ).resolves.not.toThrow();
  });
});

describe("Five-minute class reminder + duplicate prevention", () => {
  it("creates exactly one reminder even if the scheduler check runs twice for the same minute", async () => {
    // Move the entry's start time to exactly 5 minutes from "now" in college time so the check fires.
    const now = DateTime.now().setZone(env.collegeTimezone);
    const target = now.plus({ minutes: 5 });
    const todayName = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"][now.weekday - 1];

    await prisma.timetableEntry.update({
      where: { id: timetableEntryId },
      data: { day: todayName as any, startTime: target.toFormat("HH:mm"), endTime: target.plus({ hours: 1 }).toFormat("HH:mm") },
    });

    const first = await runReminderCheck();
    const second = await runReminderCheck();

    expect(first.sent).toBeGreaterThanOrEqual(1);
    expect(second.sent).toBe(0); // duplicate suppressed by the unique constraint

    const reminders = await prisma.classReminder.findMany({ where: { timetableEntryId } });
    expect(reminders.length).toBe(1);
  });
});
