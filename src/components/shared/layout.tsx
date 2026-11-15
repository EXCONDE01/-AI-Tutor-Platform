"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Layout({ children, className, sidebar, header, footer }: LayoutProps) {
  return (
    <div className={cn("flex h-screen flex-col", className)}>
      {header && <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">{header}</header>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className="hidden w-64 shrink-0 border-r lg:block lg:overflow-y-auto">
            {sidebar}
          </aside>
        )}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
      {footer && <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">{footer}</footer>}
    </div>
  );
}

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export function PageLayout({ children, className, title, description, actions, breadcrumbs }: PageLayoutProps) {
  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      {(title || breadcrumbs || actions) && (
        <div className="border-b p-4 sm:p-6">
          {breadcrumbs && <nav className="mb-4" aria-label="Breadcrumb">{breadcrumbs}</nav>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
              {description && <p className="text-muted-foreground mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className="flex-1 p-4 sm:p-6">{children}</div>
    </div>
  );
}

export function Section({ children, className, title, description, action }: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || action) && (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}