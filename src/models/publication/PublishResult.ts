import type { PublishingChannel } from "./PublishingChannel";

export interface PublishResult {
  channel: PublishingChannel;
  success: boolean;
  message?: string;
}
