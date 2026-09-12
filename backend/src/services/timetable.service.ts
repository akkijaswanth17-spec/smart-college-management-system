import { DayOfWeek } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

interface ConflictCheckInput {
  facultyId: string;
  roomId: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  academicYear: string;
  excludeId?: string;
  allowRoomConflict?: boolean;
}

/** Two [start, end) time ranges overlap if start_a < end_b AND start_b < end_a. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function assertNoTimetableConflict(input: ConflictCheckInput) {
  const candidates = await prisma.timetableEntry.findMany({
    where: {
      day: input.day,
      academicYear: input.academicYear,
      isActive: true,
      id: input.excludeId ? { not: input.excludeId } : undefined,
      OR: [{ facultyId: input.facultyId }, ...(input.allowRoomConflict ? [] : [{ roomId: input.roomId }])],
    },
    include: { faculty: true, room: true, subject: true },
  });

  for (const entry of candidates) {
    if (!overlaps(input.startTime, input.endTime, entry.startTime, entry.endTime)) continue;

    if (entry.facultyId === input.facultyId) {
      throw ApiError.conflict(
        `Faculty is already assigned to "${entry.subject.name}" from ${entry.startTime} to ${entry.endTime} on ${entry.day}`
      );
    }
    if (!input.allowRoomConflict && entry.roomId === input.roomId) {
      throw ApiError.conflict(
        `Room ${entry.room.number} is already booked for "${entry.subject.name}" from ${entry.startTime} to ${entry.endTime} on ${entry.day}`
      );
    }
  }
}
