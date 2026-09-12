import { DateTime } from "luxon";
import { DayOfWeek, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { createNotification } from "./notification.service";
import { sendClassReminderWhatsApp } from "./whatsappMessaging.service";
import { sendPushToUser } from "./webPush.service";

const DAY_NAMES: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const REMINDER_MINUTES_BEFORE = 5;
const NOTIFICATION_TYPE = "FIVE_MIN_BEFORE";

export function minusMinutes(hhmm: string, minutes: number): string | null {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m - minutes;
  if (total < 0) return null; // class starts too early in the day to reminder — skip
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Runs every minute. Finds timetable entries whose class starts in exactly
 * REMINDER_MINUTES_BEFORE minutes (in college local time) and — unless a
 * reminder for that entry+date already exists — creates one and notifies
 * the faculty member. The unique constraint on ClassReminder is the real
 * duplicate guard; the upfront findFirst just avoids noisy constraint
 * errors in the common case.
 */
export async function runReminderCheck(): Promise<{ checked: number; sent: number }> {
  const now = DateTime.now().setZone(env.collegeTimezone);
  const currentHHMM = now.toFormat("HH:mm");
  const todayName = DAY_NAMES[now.weekday - 1]; // luxon: Monday=1..Sunday=7
  const classDate = now.startOf("day").toJSDate();

  const entries = await prisma.timetableEntry.findMany({
    where: { day: todayName, isActive: true },
    include: { subject: true, room: true, block: true, faculty: { include: { user: true } } },
  });

  let sent = 0;

  for (const entry of entries) {
    const reminderTime = minusMinutes(entry.startTime, REMINDER_MINUTES_BEFORE);
    if (reminderTime !== currentHHMM) continue;

    try {
      await prisma.classReminder.create({
        data: {
          timetableEntryId: entry.id,
          facultyId: entry.facultyId,
          classDate,
          notificationType: NOTIFICATION_TYPE,
          scheduledFor: now.toJSDate(),
          sentAt: now.toJSDate(),
          status: "SENT",
        },
      });
    } catch (err) {
      // Unique constraint hit = already sent for this class today. Skip silently.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }

    await createNotification({
      userId: entry.faculty.userId,
      title: "Upcoming Class",
      type: "CLASS_REMINDER",
      relatedType: "TimetableEntry",
      relatedId: entry.id,
      message:
        `Your next class is in 5 minutes.\n\n` +
        `Subject: ${entry.subject.name}\n` +
        `Room Number: ${entry.room.number}\n` +
        `Block: ${entry.block.name}\n\n` +
        `Please attend the class on time.\n\nThank you.`,
    });

    // WhatsApp and push are best-effort extra channels — never let either
    // break the in-app reminder (which just succeeded) if unconfigured or erroring.
    try {
      await sendClassReminderWhatsApp({
        facultyName: entry.faculty.fullName,
        facultyTitle: entry.faculty.title,
        phone: entry.faculty.phone,
        subjectName: entry.subject.name,
        roomNumber: entry.room.number,
        blockName: entry.block.name,
        section: entry.section,
        startTime: entry.startTime,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[whatsapp] Failed to send reminder for faculty ${entry.faculty.id}:`, err);
    }

    try {
      await sendPushToUser(entry.faculty.userId, {
        title: "Upcoming Class",
        body: `Your next class is in 5 minutes — ${entry.subject.name}, Room ${entry.room.number}, ${entry.block.name}. Please head over now.`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[webpush] Failed to send reminder for faculty ${entry.faculty.id}:`, err);
    }

    sent += 1;
  }

  return { checked: entries.length, sent };
}
