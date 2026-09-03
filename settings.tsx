import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/zorvia/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { migrateState } from "@/lib/zorvia-store";
import type { ThemePref } from "@/lib/zorvia-types";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Data — Zorvia" },
      { name: "description", content: "Control theme, rest timers, reminders, hydration goal, haptics, and export or clear your Zorvia data." },
      { property: "og:title", content: "Settings & Data — Zorvia" },
      { property: "og:description", content: "Theme, timers, reminders, privacy and data controls." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, updateSettings, update, clearLocalData, pushToCloud, syncing } = useZorvia();
  const s = state.settings;
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zorvia-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const restored = migrateState(parsed);
      update(() => restored);
      toast.success("Backup restored");
    } catch {
      toast.error("That file could not be read");
    }
  };

  return (
    <AppShell title="Settings" subtitle="Your app, your data, your pace">
      <section className="zv-panel space-y-4 p-5">
        <span className="zv-eyebrow">Appearance</span>
        <div className="flex gap-2">
          {(["dark", "light", "system"] as ThemePref[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={s.theme === t}
              onClick={() => updateSettings({ theme: t })}
              className={`zv-tap flex-1 rounded-xl border px-3 py-2 text-sm font-semibold capitalize ${s.theme === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="zv-panel mt-3 space-y-4 p-5">
        <span className="zv-eyebrow">Training</span>
        <div className="space-y-1.5">
          <Label htmlFor="rest">Default rest (seconds)</Label>
          <Input id="rest" type="number" min={10} max={300} value={s.restDefaultSec} onChange={(e) => updateSettings({ restDefaultSec: Number(e.target.value) || 60 })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="autorest">Auto-start rest timer</Label>
          <Switch id="autorest" checked={s.autoRestTimer} onCheckedChange={(v) => updateSettings({ autoRestTimer: v })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="haptics">Haptic feedback</Label>
          <Switch id="haptics" checked={s.hapticsEnabled} onCheckedChange={(v) => updateSettings({ hapticsEnabled: v })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="units">Units</Label>
          <select id="units" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={s.units} onChange={(e) => updateSettings({ units: e.target.value as "metric" | "imperial" })}>
            <option value="metric">Metric (kg, cm)</option>
            <option value="imperial">Imperial (lb, in)</option>
          </select>
        </div>
      </section>

      <section className="zv-panel mt-3 space-y-4 p-5">
        <span className="zv-eyebrow">Reminders</span>
        <div className="space-y-1.5">
          <Label htmlFor="time">Preferred workout time</Label>
          <Input id="time" type="time" value={s.reminderTime} onChange={(e) => updateSettings({ reminderTime: e.target.value })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="rw">Workout reminders</Label>
          <Switch id="rw" checked={s.notifications.workout} onCheckedChange={(v) => updateSettings({ notifications: { ...s.notifications, workout: v } })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="rh">Hydration reminders</Label>
          <Switch id="rh" checked={s.notifications.hydration} onCheckedChange={(v) => updateSettings({ notifications: { ...s.notifications, hydration: v } })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ra">Milestone messages</Label>
          <Switch id="ra" checked={s.notifications.achievements} onCheckedChange={(v) => updateSettings({ notifications: { ...s.notifications, achievements: v } })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hg">Daily hydration goal (ml)</Label>
          <Input id="hg" type="number" min={1000} max={4000} step={100} value={s.hydrationGoalMl} onChange={(e) => updateSettings({ hydrationGoalMl: Number(e.target.value) || 2500 })} />
        </div>
      </section>

      <section className="zv-panel mt-3 space-y-3 p-5">
        <span className="zv-eyebrow">Your data</span>
        <p className="text-xs text-muted-foreground">
          Everything works offline and is stored on this device. When you&apos;re signed in, Zorvia syncs a copy to your account so you can restore it later.
        </p>
        <div className="grid gap-2">
          <Button variant="outline" onClick={exportData}>Export backup (JSON)</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Restore from backup</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importData(f);
            }}
          />
          <Button variant="outline" disabled={syncing} onClick={() => void pushToCloud()}>{syncing ? "Syncing…" : "Sync now"}</Button>
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm("Clear all Zorvia data on this device? This cannot be undone.")) {
                clearLocalData();
                toast.success("Local data cleared");
              }
            }}
          >
            Clear local data
          </Button>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-faint">Zorvia V2 · Presented by Ashfak Alom Adil</p>
    </AppShell>
  );
}
