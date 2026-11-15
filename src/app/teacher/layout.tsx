import { Header, Sidebar } from "@/components/shared/nav";
import { getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await getSession();
  const session = sessionResult.data;
  
  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="teacher" />
      <Header 
        role="teacher" 
        title="Teacher Dashboard" 
        description="Manage your classes and students"
        displayName={session.user.name || session.user.email}
      />
      <div className="lg:ml-20">
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}