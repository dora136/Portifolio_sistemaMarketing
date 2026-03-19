import { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <header className="sticky top-0 z-40">
        <div className="h-1 w-full bg-primary" />
        <div className="h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div className="flex h-full w-full items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4C956C]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FEEEC3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 13l5 5L20 6" />
                </svg>
              </div>
              <span className="text-lg font-bold text-foreground">Portfolio</span>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                IC
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-medium text-foreground">Isadora Castelo</p>
                <p className="text-xs text-muted-foreground">admin</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* header = h-1 + h-16 = 4.25rem */}
      <div className="flex h-[calc(100vh-4.25rem)] w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
