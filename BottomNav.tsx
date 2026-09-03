import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, Home, Library, LineChart, Salad } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/exercises", label: "Exercises", icon: Library },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/nutrition", label: "Nutrition", icon: Salad },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-1.5">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className="zv-tap flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors"
              >
                <Icon
                  className={`size-5 transition-transform ${active ? "scale-110 text-primary" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <span className={`text-[0.625rem] font-semibold tracking-wide ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
