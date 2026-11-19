import { Header, Sidebar } from "@/components/shared/nav";
import { getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { TeacherLayoutClient } from "./teacher-layout-client";

interface SessionUser {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: boolean;
  };
}

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await getSession();
  const session = sessionResult.data as SessionUser | null;
  
  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <TeacherLayoutClient session={session}>
      {children}
    </TeacherLayoutClient>
  );
}