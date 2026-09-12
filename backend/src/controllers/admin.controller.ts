import { Request, Response } from "express";
import { DateTime } from "luxon";
import { DayOfWeek } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

const DAY_NAMES: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const today = DateTime.now().setZone(env.collegeTimezone);
  const todayName = DAY_NAMES[today.weekday - 1];

  const [
    totalStudents,
    totalFaculty,
    todaysClasses,
    activeNotices,
    academicUpdatesCount,
    pendingLostFound,
    pendingWhatsAppRequests,
    recentUsers,
    recentNotices,
    upcomingTimetable,
    pendingRequests,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.faculty.count({ where: { status: "ACTIVE" } }),
    prisma.timetableEntry.count({ where: { day: todayName, isActive: true } }),
    prisma.notice.count({ where: { isPublished: true, OR: [{ expiryDate: null }, { expiryDate: { gte: today.toJSDate() } }] } }),
    prisma.academicUpdate.count({ where: { date: { gte: today.startOf("day").toJSDate() } } }),
    prisma.lostFoundItem.count({ where: { status: { in: ["LOST", "FOUND"] } } }),
    prisma.whatsAppRequest.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, email: true, role: true, createdAt: true } }),
    prisma.notice.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
    prisma.timetableEntry.findMany({
      where: { day: todayName, isActive: true },
      take: 8,
      orderBy: { startTime: "asc" },
      include: { faculty: true, subject: true, room: true, block: true },
    }),
    prisma.whatsAppRequest.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { student: { select: { fullName: true } }, group: { select: { name: true } } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalStudents,
        totalFaculty,
        todaysClasses,
        activeNotices,
        academicUpdatesCount,
        pendingLostFound,
        pendingWhatsAppRequests,
      },
      recentUsers,
      recentNotices,
      upcomingTimetable,
      pendingRequests,
    },
  });
});

export const updateSelf = asyncHandler(async (req: Request, res: Response) => {
  const { fullName } = req.body;
  const admin = await prisma.admin.upsert({
    where: { userId: req.user!.userId },
    update: { fullName },
    create: { userId: req.user!.userId, fullName },
  });
  res.json({ success: true, data: admin });
});
