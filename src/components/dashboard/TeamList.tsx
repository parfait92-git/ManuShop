import type { User } from "@/models/user/User";

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Admin",
  seller: "Vendeur",
  client: "Client",
};

export function TeamList({ members }: { members: User[] }) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun membre pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium">{member.displayName}</span>
            <span className="text-sm text-muted-foreground">
              {member.email}
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {ROLE_LABELS[member.role]}
          </span>
        </li>
      ))}
    </ul>
  );
}
