import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { getPagination, buildMeta } from "../utils/pagination";

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req, 30);
  const { action, targetType } = req.query;

  const where = {
    ...(action ? { action: String(action) } : {}),
    ...(targetType ? { targetType: String(targetType) } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ success: true, data: logs, meta: buildMeta(total, page, pageSize) });
});
