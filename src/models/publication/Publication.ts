import type { Timestamp } from "firebase/firestore";
import type { PublishingChannel } from "./PublishingChannel";
import type { PublishResult } from "./PublishResult";

export interface Publication {
  id: string;
  shopId: string;
  content: string;
  imageUrl: string;
  channels: PublishingChannel[];
  scheduledAt?: Timestamp;
  publishedAt?: Timestamp;
  status: "draft" | "scheduled" | "published" | "failed";
  results: PublishResult[];
}
