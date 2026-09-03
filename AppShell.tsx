import { Link } from "@tanstack/react-router";
import { Settings, Sparkles, User } from "lucide-react";
import type { ReactNode } from "react";

import { BottomNav } from "./BottomNav";

interface AppShellProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Hide the bottom navigation (e.g. during an active workout session). */
  bare?: boolean;
  action?: ReactNode;
}

export function AppShell({ title, subtitle, children, bare, action }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      {title ? (
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-bold tracking-tight">{title}</h1>
              {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
            {action ?? (
              <div className="flex items-center gap-1">
                <Link to="/coach" aria-label="Zorvia Coach" className="zv-tap grid place-items-center rounded-xl text-muted-foreground hover:text-primary">
                  <Sparkles className="size-5" aria-hidden="true" />
                </Link>
                <Link to="/profile" aria-label="Profile" className="zv-tap grid place-items-center rounded-xl text-muted-foreground hover:text-primary">
                  <User className="size-5" aria-hidden="true" />
                </Link>
                <Link to="/settings" aria-label="Settings" className="zv-tap grid place-items-center rounded-xl text-muted-foreground hover:text-primary">
                  <Settings className="size-5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </header>
      ) : null}

      <main className={`mx-auto w-full max-w-2xl px-4 pt-4 ${bare ? "pb-8" : "zv-pb-nav"}`}>{children}</main>

      {bare ? null : <BottomNav />}
    </div>
  );
}
