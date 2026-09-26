import type { ActivityLogEntry } from "@/models/activity/ActivityLogEntry";

export type CreateActivityLogDto = Omit<ActivityLogEntry, "id" | "createdAt">;

export interface IActivityLogRepository {
  listByShop(shopId: string): Promise<ActivityLogEntry[]>;
  create(data: CreateActivityLogDto): Promise<ActivityLogEntry>;
}
