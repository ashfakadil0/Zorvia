import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/zorvia/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EQUIPMENT_LIST, type Equipment } from "@/data/exercises";
import { GOAL_LABELS, LEVEL_LABELS, type FitnessLevel, type Goal } from "@/lib/zorvia-types";
import { useAuth } from "@/hooks/useAuth";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Zorvia" },
      { name: "description", content: "Update your name, body stats, level, goal and equipment so Zorvia keeps your training personalised." },
      { property: "og:title", content: "Your Profile — Zorvia" },
      { property: "og:description", content: "Keep your training personal: stats, level, goal and available equipment." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { state, updateProfile } = useZorvia();
  const { user, signOut } = useAuth();
  const p = state.profile;
  const isMinor = (p.age ?? 99) < 18;

  return (
    <AppShell title="Profile" subtitle={user?.email ?? "Signed in locally"}>
      <section className="zv-panel space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={p.name} maxLength={40} onChange={(e) => updateProfile({ name: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" value={p.age ?? ""} onChange={(e) => updateProfile({ age: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h">Height (cm)</Label>
            <Input id="h" type="number" value={p.heightCm ?? ""} onChange={(e) => updateProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w">Weight (kg)</Label>
            <Input id="w" type="number" value={p.weightKg ?? ""} onChange={(e) => updateProfile({ weightKg: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="level">Experience</Label>
          <select
            id="level"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            value={p.level}
            onChange={(e) => updateProfile({ level: e.target.value as FitnessLevel })}
          >
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal">Main goal</Label>
          <select
            id="goal"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            value={p.goal}
            onChange={(e) => updateProfile({ goal: e.target.value as Goal })}
          >
            {Object.entries(GOAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Available equipment</legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_LIST.map((item: Equipment) => {
              const on = p.equipment.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    updateProfile({
                      equipment: on ? p.equipment.filter((e) => e !== item) : [...p.equipment, item],
                    })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </fieldset>

        {isMinor ? (
          <p className="text-xs text-gold">
            You&apos;re under 18 — Zorvia prioritises growth, technique, recovery and healthy habits, and never suggests calorie restriction.
          </p>
        ) : null}
      </section>

      <div className="mt-3 grid gap-2">
        <Button asChild variant="outline"><Link to="/settings">Settings & data</Link></Button>
        <Button asChild variant="outline"><Link to="/routines">Custom routines</Link></Button>
        {user ? (
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/auth" });
            }}
          >
            Sign out
          </Button>
        ) : (
          <Button asChild variant="ghost"><Link to="/auth">Sign in to sync</Link></Button>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-faint">Presented by Ashfak Alom Adil</p>
    </AppShell>
  );
}
