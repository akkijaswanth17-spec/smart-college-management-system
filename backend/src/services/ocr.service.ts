import { createWorker } from "tesseract.js";
import sharp from "sharp";

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

export interface ExtractedLegendRow {
  code: string | null;
  subjectName: string;
  facultyName: string;
}

export interface ExtractedHeader {
  departmentText: string | null;
  academicYear: string | null;
  classSemesterText: string | null;
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

// Matches the "Subject Code | Subject Name | Faculty Name (id)" legend table
// most college timetable sheets print below the grid — e.g.
// "ME-301 | Engineering Mathematics - II Mrs. N Lakshmi Divya (1991)".
// In practice OCR rarely preserves a real column separator between the
// subject name and the faculty name (just a space gap), so the reliable
// anchor is the faculty honorific (Mr/Mrs/Ms/Dr — "Nr." is included because
// OCR frequently misreads "Mr." that way) rather than a delimiter: whatever
// comes before the honorific is the subject, whatever follows (minus a
// trailing "(1991)"-style staff id) is the faculty name.
const LEGEND_LINE_PATTERN =
  /^([A-Z]{1,6}[\s-]*\d{2,4})?\s*[|:-]?\s*(.+?)\s+((?:Mr|Mrs|Ms|Dr|Nr|Miss)\.?\s+[A-Za-z][A-Za-z.\s]*?)\s*(?:\(\s*\d+\s*\))?\s*$/i;

function parseLegendLine(line: string): ExtractedLegendRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 8) return null;
  if (/subject\s*code|name\s*of\s*the\s*faculty/i.test(trimmed)) return null; // header row itself

  const match = trimmed.match(LEGEND_LINE_PATTERN);
  if (!match) return null;

  const [, code, subjectName, facultyName] = match;
  if (!subjectName || !facultyName) return null;

  return {
    code: code ? code.replace(/\s+/g, "").toUpperCase() : null,
    subjectName: subjectName.trim().replace(/^[|:\-\s]+/, ""),
    facultyName: facultyName.trim(),
  };
}

function parseHeader(text: string): ExtractedHeader {
  // [^\S\n] (whitespace but not newline) keeps each match on its own source
  // line — a plain \s would happily bleed into the next line's text.
  const deptMatch = text.match(/department[^\S\n]*[:\-]?[^\S\n]*([A-Za-z&]{2,15})/i);
  const yearMatch = text.match(/academic[^\S\n]*year[^\S\n]*[:\-]?[^\S\n]*(\d{4}[^\S\n]*-[^\S\n]*\d{2,4})/i);
  const classMatch = text.match(
    /class[^\S\n]*\/?[^\S\n]*semester[^\S\n]*[:\-]?[^\S\n]*([A-Za-z0-9/][A-Za-z0-9/\- ]{1,24})/i
  );

  return {
    departmentText: deptMatch ? deptMatch[1].trim().toUpperCase() : null,
    academicYear: yearMatch ? yearMatch[1].replace(/[^\S\n]+/g, "") : null,
    classSemesterText: classMatch ? classMatch[1].trim() : null,
  };
}

/**
 * Upscales, sharpens and binarizes the image before OCR. Real college
 * timetable photos/screenshots are frequently low-resolution relative to
 * how much small text they pack in (a full-page table shrunk to a few
 * hundred pixels wide) — tesseract reads the larger header/legend text far
 * more reliably once it has more effective pixels per character to work
 * with. This does not invent detail that was never captured; a grid of
 * tiny, blurry table cells will still OCR unreliably no matter how much
 * it's upscaled, which is why extracted day/period rows should always be
 * treated as a best-effort starting point for manual review, never as
 * final data.
 */
async function preprocessForOcr(imagePath: string): Promise<Buffer> {
  return sharp(imagePath)
    .grayscale()
    .resize({ width: 2400, withoutEnlargement: false })
    .normalize()
    .sharpen()
    .threshold(150)
    .png()
    .toBuffer();
}

export async function extractTimetableFromImage(imagePath: string): Promise<{
  rawText: string;
  rows: ExtractedTimetableRow[];
  legend: ExtractedLegendRow[];
  header: ExtractedHeader;
}> {
  const worker = await createWorker("eng");
  try {
    const preprocessed = await preprocessForOcr(imagePath);
    const {
      data: { text },
    } = await worker.recognize(preprocessed);

    const lines = text.split("\n");
    const rows = lines.map(parseLine).filter((r): r is ExtractedTimetableRow => r !== null);
    const legend = lines.map(parseLegendLine).filter((r): r is ExtractedLegendRow => r !== null);
    const header = parseHeader(text);

    return { rawText: text, rows, legend, header };
  } finally {
    await worker.terminate();
  }
}
