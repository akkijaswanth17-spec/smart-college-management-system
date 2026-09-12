import { createWorker } from "tesseract.js";

export interface ExtractedTimetableRow {
  day: string | null;
  startTime: string | null;
  endTime: string | null;
  subjectText: string | null;
  facultyText: string | null;
  room: string | null;
  block: string | null;
  rawLine: string;
}

const DAY_PATTERN = /\b(mon(day)?|tue(s|sday)?|wed(nesday)?|thu(rs|rsday)?|fri(day)?|sat(urday)?|sun(day)?)\b/i;
const TIME_RANGE_PATTERN = /(\d{1,2})[:.](\d{2})\s*(?:am|pm)?\s*[-–to]{1,3}\s*(\d{1,2})[:.](\d{2})\s*(?:am|pm)?/i;
const ROOM_PATTERN = /\broom\s*[:#]?\s*(\w+)/i;
const ROOM_BARE_PATTERN = /\b(\d{2,4})\b/;
const BLOCK_PATTERN = /\bblock\s*[:#]?\s*([A-Za-z0-9]+)\b|\b([A-Za-z])\s*block\b/i;

const DAY_MAP: Record<string, string> = {
  mon: "MONDAY",
  tue: "TUESDAY",
  wed: "WEDNESDAY",
  thu: "THURSDAY",
  fri: "FRIDAY",
  sat: "SATURDAY",
  sun: "SUNDAY",
};

function normalizeTime(h: string, m: string): string {
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function parseLine(line: string): ExtractedTimetableRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const dayMatch = trimmed.match(DAY_PATTERN);
  const timeMatch = trimmed.match(TIME_RANGE_PATTERN);
  const roomMatch = trimmed.match(ROOM_PATTERN) ?? trimmed.match(ROOM_BARE_PATTERN);
  const blockMatch = trimmed.match(BLOCK_PATTERN);

  if (!dayMatch && !timeMatch) return null; // not a schedule-looking line

  let remainder = trimmed;
  if (timeMatch) remainder = remainder.replace(timeMatch[0], " ");
  if (dayMatch) remainder = remainder.replace(dayMatch[0], " ");
  if (roomMatch) remainder = remainder.replace(roomMatch[0], " ");
  if (blockMatch) remainder = remainder.replace(blockMatch[0], " ");
  remainder = remainder.replace(/\s{2,}/g, " ").trim();

  const parts = remainder.split(/[-–,|]/).map((p) => p.trim()).filter(Boolean);

  return {
    day: dayMatch ? DAY_MAP[dayMatch[1].slice(0, 3).toLowerCase()] ?? null : null,
    startTime: timeMatch ? normalizeTime(timeMatch[1], timeMatch[2]) : null,
    endTime: timeMatch ? normalizeTime(timeMatch[3], timeMatch[4]) : null,
    subjectText: parts[0] ?? null,
    facultyText: parts[1] ?? null,
    room: roomMatch ? roomMatch[1] ?? roomMatch[0] : null,
    block: blockMatch ? blockMatch[1] ?? blockMatch[2] ?? null : null,
    rawLine: trimmed,
  };
}

/**
 * Runs real OCR (tesseract.js) on an uploaded timetable image and applies
 * best-effort heuristics to split lines into day/time/subject/room/block
 * guesses. This is intentionally best-effort — the admin UI always shows
 * the raw text plus editable extracted rows and requires explicit
 * confirmation before anything is written to the database.
 */
export async function extractTimetableFromImage(imagePath: string): Promise<{
  rawText: string;
  rows: ExtractedTimetableRow[];
}> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);

    const rows = text
      .split("\n")
      .map(parseLine)
      .filter((r): r is ExtractedTimetableRow => r !== null);

    return { rawText: text, rows };
  } finally {
    await worker.terminate();
  }
}
