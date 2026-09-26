import type {
  ActivityLogAction,
  ActivityLogEntry,
} from "@/models/activity/ActivityLogEntry";
import type { OrderStatus } from "@/models/order/OrderStatus";
import { activityLogRepository } from "@/repositories/ActivityLogRepository";
import type { IActivityLogRepository } from "@/repositories/interfaces/IActivityLogRepository";

interface LogContext {
  shopId: string;
  actorId: string;
  actorName: string;
}

/** Journal d'activité commerçant (BF-98). Un helper typé par événement
 * plutôt qu'un `create()` générique à chaque site d'appel — évite de
 * répéter la forme `action`/`targetType`/`metadata`. */
export class ActivityLogService {
  constructor(
    private readonly logs: IActivityLogRepository = activityLogRepository
  ) {}

  listRecent(shopId: string): Promise<ActivityLogEntry[]> {
    return this.logs.listByShop(shopId);
  }

  private log(
    context: LogContext,
    action: ActivityLogAction,
    targetType: ActivityLogEntry["targetType"],
    targetId: string,
    metadata?: Record<string, unknown>
  ): Promise<ActivityLogEntry> {
    return this.logs.create({
      shopId: context.shopId,
      actorId: context.actorId,
      actorName: context.actorName,
      action,
      targetType,
      targetId,
      metadata,
    });
  }

  logProductPublished(context: LogContext, productId: string, productName: string) {
    return this.log(context, "product.published", "product", productId, {
      productName,
    });
  }

  logProductUnpublished(context: LogContext, productId: string, productName: string) {
    return this.log(context, "product.unpublished", "product", productId, {
      productName,
    });
  }

  logProductTrashed(context: LogContext, productId: string, productName: string) {
    return this.log(context, "product.trashed", "product", productId, {
      productName,
    });
  }

  logProductRestored(context: LogContext, productId: string, productName: string) {
    return this.log(context, "product.restored", "product", productId, {
      productName,
    });
  }

  logCategoryTrashed(context: LogContext, categoryId: string, categoryName: string) {
    return this.log(context, "category.trashed", "category", categoryId, {
      categoryName,
    });
  }

  logCategoryRestored(context: LogContext, categoryId: string, categoryName: string) {
    return this.log(context, "category.restored", "category", categoryId, {
      categoryName,
    });
  }

  logShopSettingsUpdated(context: LogContext) {
    return this.log(context, "shop.settings_updated", "shop", context.shopId);
  }

  logOrderCreated(context: LogContext, orderId: string, clientName: string) {
    return this.log(context, "order.created", "order", orderId, { clientName });
  }

  logOrderStatusChanged(context: LogContext, orderId: string, status: OrderStatus) {
    return this.log(context, "order.status_changed", "order", orderId, { status });
  }

  logOrderCancelled(context: LogContext, orderId: string, reason: string) {
    return this.log(context, "order.cancelled", "order", orderId, { reason });
  }

  logOrderReturned(
    context: LogContext,
    orderId: string,
    outcome: Extract<OrderStatus, "returned" | "defective">,
    reason: string
  ) {
    return this.log(context, "order.returned", "order", orderId, { outcome, reason });
  }
}

export const activityLogService = new ActivityLogService();
