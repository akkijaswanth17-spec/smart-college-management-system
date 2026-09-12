import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { getPagination, buildMeta } from "../utils/pagination";
import { recordAudit } from "../services/audit.service";
import { createNotification } from "../services/notification.service";

export const listGroups = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.role === "ADMIN";
  const groups = await prisma.whatsAppGroup.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    // Invite links are never exposed publicly — only to admins here, or to
    // a student whose request for that specific group was approved (see myRequests).
    select: {
      id: true,
      name: true,
      subject: true,
      department: true,
      year: true,
      section: true,
      isActive: true,
      createdAt: true,
      inviteLink: isAdmin,
    },
  });
  res.json({ success: true, data: groups });
});

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const group = await prisma.whatsAppGroup.create({ data: req.body });
  await recordAudit({
    userId: req.user!.userId,
    action: "WHATSAPP_GROUP_CREATED",
    targetType: "WhatsAppGroup",
    targetId: group.id,
  });
  res.status(201).json({ success: true, data: group });
});

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const request = await prisma.whatsAppRequest.create({
    data: { ...req.body, studentId: student.id },
    include: { group: { select: { name: true, subject: true } } },
  });

  res.status(201).json({ success: true, data: request });
});

export const myRequests = asyncHandler(async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
  if (!student) throw ApiError.notFound("Student profile not found");

  const requests = await prisma.whatsAppRequest.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    include: { group: { select: { name: true, subject: true } } },
  });

  // Only reveal the invite link once a request has actually been approved.
  const data = await Promise.all(
    requests.map(async (r) => {
      if (r.status !== "APPROVED") return { ...r, inviteLink: null };
      const group = await prisma.whatsAppGroup.findUnique({ where: { id: r.groupId }, select: { inviteLink: true } });
      return { ...r, inviteLink: group?.inviteLink ?? null };
    })
  );

  res.json({ success: true, data });
});

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, pageSize } = getPagination(req);
  const { status, department, groupId } = req.query;

  const where = {
    ...(status ? { status: String(status) as any } : {}),
    ...(department ? { department: String(department) } : {}),
    ...(groupId ? { groupId: String(groupId) } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.whatsAppRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { fullName: true, studentId: true } },
        group: { select: { name: true, subject: true } },
      },
    }),
    prisma.whatsAppRequest.count({ where }),
  ]);

  res.json({ success: true, data: requests, meta: buildMeta(total, page, pageSize) });
});

export const updateRequestStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: "APPROVED" | "REJECTED" };
  const existing = await prisma.whatsAppRequest.findUnique({
    where: { id: req.params.id },
    include: { student: true, group: true },
  });
  if (!existing) throw ApiError.notFound("Request not found");

  const updated = await prisma.whatsAppRequest.update({ where: { id: req.params.id }, data: { status } });

  await createNotification({
    userId: existing.student.userId,
    title: `WhatsApp Group Request ${status === "APPROVED" ? "Approved" : "Rejected"}`,
    type: "WHATSAPP_REQUEST",
    message:
      status === "APPROVED"
        ? `Your request to join "${existing.group.name}" has been approved. Check the WhatsApp Groups page for the invite link.`
        : `Your request to join "${existing.group.name}" was not approved.`,
  });

  await recordAudit({
    userId: req.user!.userId,
    action: status === "APPROVED" ? "WHATSAPP_REQUEST_APPROVED" : "WHATSAPP_REQUEST_REJECTED",
    targetType: "WhatsAppRequest",
    targetId: updated.id,
  });

  res.json({ success: true, data: updated });
});

export const deleteRequest = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.whatsAppRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Request not found");
  await prisma.whatsAppRequest.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: "Request deleted" });
});
