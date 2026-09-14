import Link from "next/link";
import type { ReactNode } from "react";
import type { Author } from "@/lib/api";

export default function ProfileLink({ user, userId, children, className = "" }: {
  user?: Author | null;
  userId?: number | null;
  children: ReactNode;
  className?: string;
}) {
  const id = user?.user_id ?? userId;
  if (!id) return <span className={className}>{children}</span>;
  return <Link href={"/usuario/" + id} aria-label={"Ver perfil de " + (user ? "@" + user.username : "usuário " + id)}
    className={"rounded-lg hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary " + className}>
    {children}
  </Link>;
}
