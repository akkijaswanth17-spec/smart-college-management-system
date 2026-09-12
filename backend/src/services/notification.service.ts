import { NotificationType } from "@prisma/client";
import { prisma } from "../config/prisma";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  relatedType?: string;
  relatedId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type ?? "SYSTEM",
      relatedType: params.relatedType,
      relatedId: params.relatedId,
    },
  });
}

export async function notifyMany(userIds: string[], data: Omit<CreateNotificationParams, "userId">) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: data.title,
      message: data.message,
      type: data.type ?? "SYSTEM",
      relatedType: data.relatedType,
      relatedId: data.relatedId,
    })),
  });
}
