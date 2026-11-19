"use client";

import * as React from "react";
import { Header, Sidebar } from "@/components/shared/nav";
import { RealtimeProvider } from "@/lib/realtime/client";
import { getRealtimeClient } from "@/lib/realtime/client";

interface TeacherLayoutClientProps {
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      emailVerified?: boolean;
    };
  };
  children: React.ReactNode;
}

export function TeacherLayoutClient({ session, children }: TeacherLayoutClientProps) {
  const realtimeClient = getRealtimeClient();

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
          <RealtimeProvider client={realtimeClient}>{children}</RealtimeProvider>
        </main>
      </div>
    </div>
  );
}