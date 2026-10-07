import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { ExtractedTimetableRow, ExtractedLegendRow, ExtractedHeader } from "./ocr.service";

const DAY_PATTERN = /\b(mon(day)?|tue(s|sday)?|wed(nesday)?|thu(rs|rsday)?|fri(day)?|sat(urday)?|sun(day)?)\b/i;
const DAY_MAP: Record<string, string> = {
  mon: "MONDAY",
  tue: "TUESDAY",
  wed: "WEDNESDAY",
  thu: "THURSDAY",
  fri: "FRIDAY",
  sat: "SATURDAY",
  sun: "SUNDAY",
};
const TIME_PATTERN = /(\d{1,2})[:.](\d{2})\s*(am|pm)?/i;
const TIME_RANGE_PATTERN = /(\d{1,2})[:.](\d{2})\s*(?:am|pm)?\s*[-–to]{1,3}\s*(\d{1,2})[:.](\d{2})\s*(?:am|pm)?/i;

function normalizeTime(h: string, m: string): string {
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function dayFromCell(cell: string): string | null {
  const m = cell.match(DAY_PATTERN);
  return m ? DAY_MAP[m[1].slice(0, 3).toLowerCase()] ?? null : null;
}

/** A header cell might be a full range ("9:00-10:00"), or just a start time if the
 * sheet splits start/end across two header rows — in that case the matching cell
 * from the second header row (same column) is passed as a fallback end-time source. */
function parseTimeSlot(cellText: string, fallbackCellText?: string): { start: string | null; end: string | null } {
  const range = cellText.match(TIME_RANGE_PATTERN);
  if (range) return { start: normalizeTime(range[1], range[2]), end: normalizeTime(range[3], range[4]) };

  const start = cellText.match(TIME_PATTERN);
  const end = fallbackCellText?.match(TIME_PATTERN);
  if (start && end) return { start: normalizeTime(start[1], start[2]), end: normalizeTime(end[1], end[2]) };
  if (start) return { start: normalizeTime(start[1], start[2]), end: null };
  return { start: null, end: null };
}

function parseHeaderText(text: string): ExtractedHeader {
  const deptMatch = text.match(/department[^\S\n]*[:\-]?[^\S\n]*([A-Za-z&]{2,15})/i);
  const yearMatch = text.match(/academic[^\S\n]*year[^\S\n]*[:\-]?[^\S\n]*(\d{4}[^\S\n]*-[^\S\n]*\d{2,4})/i);
  const classMatch = text.match(
    /class[^\S\n]*\/?[^\S\n]*semester[^\S\n]*[:\-]?[^\S\n]*([A-Za-z0-9/][A-Za-z0-9/\- ]{1,25})/i
  );
  return {
    departmentText: deptMatch ? deptMatch[1].trim().toUpperCase() : null,
    academicYear: yearMatch ? yearMatch[1].replace(/[^\S\n]+/g, "") : null,
    classSemesterText: classMatch ? classMatch[1].trim() : null,
  };
}

/**
 * Extracts a timetable from a Word (.docx) document's table(s). Unlike photo OCR,
 * Word tables carry exact structured cell text straight from the document's own
 * XML — no character-recognition guessing involved — so a table that matches the
 * day-by-day grid shape can be read in full, not just its legend. Still returned
 * as best-effort rows for the existing review-before-save UI, since table layouts
 * vary between colleges and heuristics can still misread an unusual layout.
 */
export async function extractTimetableFromWord(buffer: Buffer): Promise<{
  rawText: string;
  rows: ExtractedTimetableRow[];
  legend: ExtractedLegendRow[];
  header: ExtractedHeader;
}> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html);
  const bodyText = $.root().text();
  const header = parseHeaderText(bodyText);

  const rows: ExtractedTimetableRow[] = [];
  const legend: ExtractedLegendRow[] = [];

  $("table").each((_, table) => {
    const grid: string[][] = $(table)
      .find("tr")
      .toArray()
      .map((tr) =>
        $(tr)
          .find("td,th")
          .toArray()
          .map((cell) => $(cell).text().replace(/\s+/g, " ").trim())
      )
      .filter((r) => r.length > 0);
    if (grid.length < 2) return;

    const headerRow = grid[0];
    const headerJoined = headerRow.join(" ").toLowerCase();
    const isLegendTable = /faculty|staff|teacher/.test(headerJoined) && /subject/.test(headerJoined);
    const firstColDays = grid.slice(1).filter((r) => dayFromCell(r[0] ?? "")).length;
    const isGridTable = !isLegendTable && firstColDays >= 2; // at least a couple of real day rows

    if (isLegendTable) {
      const codeIdx = headerRow.findIndex((h) => /code/i.test(h));
      const subjIdx = headerRow.findIndex((h) => /subject/i.test(h) && !/code/i.test(h));
      const facIdx = headerRow.findIndex((h) => /faculty|staff|teacher/i.test(h));
      for (const row of grid.slice(1)) {
        if (!row.some((c) => c)) continue;
        const subjectName = (subjIdx >= 0 ? row[subjIdx] : row[Math.min(1, row.length - 1)])?.trim();
        const facultyNameRaw = (facIdx >= 0 ? row[facIdx] : row[row.length - 1])?.trim();
        if (!subjectName || !facultyNameRaw) continue;
        legend.push({
          code: codeIdx >= 0 && row[codeIdx] ? row[codeIdx].replace(/\s+/g, "").toUpperCase() : null,
          subjectName,
          facultyName: facultyNameRaw.replace(/\(\s*\d+\s*\)\s*$/, "").trim(),
        });
      }
    } else if (isGridTable) {
      // A second header row (e.g. end times under start times) is used as a
      // same-column fallback when a header cell only has one time in it.
      const secondRow = grid[1] && !dayFromCell(grid[1][0] ?? "") ? grid[1] : null;
      const bodyStart = secondRow ? 2 : 1;
      const timeSlots = headerRow
        .slice(1)
        .map((cell, i) => parseTimeSlot(cell, secondRow?.[i + 1]));

      for (const row of grid.slice(bodyStart)) {
        const day = dayFromCell(row[0] ?? "");
        if (!day) continue;
        for (let i = 1; i < row.length; i++) {
          const cellText = row[i]?.trim();
          if (!cellText) continue;
          const slot = timeSlots[i - 1] ?? { start: null, end: null };
          rows.push({
            day,
            startTime: slot.start,
            endTime: slot.end,
            subjectText: cellText,
            facultyText: null,
            room: null,
            block: null,
            rawLine: `${day} ${cellText}`,
          });
        }
      }
    }
  });

  return { rawText: bodyText, rows, legend, header };
}
