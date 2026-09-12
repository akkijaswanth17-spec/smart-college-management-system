import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, data: departments });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await prisma.department.create({ data: req.body });
  res.status(201).json({ success: true, data: department });
});

export const listSubjects = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.query;
  const subjects = await prisma.subject.findMany({
    where: departmentId ? { departmentId: String(departmentId) } : undefined,
    orderBy: { name: "asc" },
  });
  res.json({ success: true, data: subjects });
});

export const createSubject = asyncHandler(async (req: Request, res: Response) => {
  const subject = await prisma.subject.create({ data: req.body });
  res.status(201).json({ success: true, data: subject });
});

export const listBlocks = asyncHandler(async (_req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, data: blocks });
});

export const createBlock = asyncHandler(async (req: Request, res: Response) => {
  const block = await prisma.block.create({ data: req.body });
  res.status(201).json({ success: true, data: block });
});

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const { blockId } = req.query;
  const rooms = await prisma.room.findMany({
    where: blockId ? { blockId: String(blockId) } : undefined,
    include: { block: true },
    orderBy: { number: "asc" },
  });
  res.json({ success: true, data: rooms });
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await prisma.room.create({ data: req.body, include: { block: true } });
  res.status(201).json({ success: true, data: room });
});
