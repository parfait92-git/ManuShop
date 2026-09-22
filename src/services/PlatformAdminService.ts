import type { User } from "@/models/user/User";
import { platformAdminRepository } from "@/repositories/PlatformAdminRepository";
import { userRepository } from "@/repositories/UserRepository";
import type { IPlatformAdminRepository } from "@/repositories/interfaces/IPlatformAdminRepository";
import type { IUserRepository } from "@/repositories/interfaces/IUserRepository";

export class PlatformAdminService {
  constructor(
    private readonly platformAdmins: IPlatformAdminRepository = platformAdminRepository,
    private readonly users: IUserRepository = userRepository
  ) {}

  /** Un compte sans email (téléphone, anonyme) ne peut jamais être Super
   * Admin — la collection `platformAdmins` est indexée par email. */
  isSuperAdmin(email: string | null | undefined): Promise<boolean> {
    if (!email) return Promise.resolve(false);
    return this.platformAdmins.exists(email);
  }

  /** Recherche par pseudo, email ou téléphone (BF-68). Filtrage en mémoire,
   * comme `ProductService.search` : pas de moteur de recherche dédié tant
   * que la base d'utilisateurs reste petite. */
  async searchUsers(term: string): Promise<User[]> {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return [];

    const all = await this.users.listAll();
    return all.filter(
      (user) =>
        user.displayName.toLowerCase().includes(normalized) ||
        (user.email?.toLowerCase().includes(normalized) ?? false) ||
        (user.phone?.toLowerCase().includes(normalized) ?? false)
    );
  }

  /** Attribution manuelle du rôle admin (BF-68), indépendante d'un
   * abonnement (`adminSource: "manual"`) — pas de date d'expiration, valable
   * jusqu'à révocation explicite. */
  grantAdmin(userId: string): Promise<void> {
    return this.users.update(userId, {
      role: "admin",
      adminSource: "manual",
    });
  }

  /** Révoque le rôle admin, quelle qu'en soit l'origine (BF-68/BF-70). Les
   * champs `adminSource`/`subscriptionPlan`/`subscriptionExpiresAt` sont
   * laissés tels quels : ils seront de toute façon écrasés à la prochaine
   * attribution, et ne sont jamais lus pour un compte non-admin. */
  revokeAdmin(userId: string): Promise<void> {
    return this.users.update(userId, { role: "client" });
  }
}

export const platformAdminService = new PlatformAdminService();
