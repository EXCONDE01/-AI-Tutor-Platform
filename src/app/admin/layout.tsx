import { Header, Sidebar } from "@/components/shared/nav";
import { getAppUser } from "@/lib/auth/provision";
import type { AppRole } from "@/lib/auth/provision";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appUser = await getAppUser();

  if (!appUser) {
    // Not signed in, or signed in but no app user row
    redirect("/sign-in");
  }

  if (appUser.role !== 'admin') {
    redirect("/unauthorized?requiredRole=admin");
  }

  const displayName = appUser.user.displayName || appUser.user.email;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="admin" />
      <Header 
        role="admin" 
        title="Admin" 
        description="Platform administration"
        displayName={displayName}
      />
      <div className="lg:ml-20">
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}