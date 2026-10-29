import Notification from "@/models/Notification";
import type { NotificationType } from "@/types";

/** Create an in-app notification. Email / Telegram delivery comes later via services/notify.ts. */
export async function notifyInApp(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  requestId?: string;
}) {
  return Notification.create({
    user: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    request: params.requestId ?? null,
    channels: ["in_app"],
  });
}