import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";

export const Route = createFileRoute("/form-check")({
  head: () => ({
    meta: [
      { title: "AI Form Check (Coming Soon) — Zorvia" },
      { name: "description", content: "Camera-based technique feedback is in development. Until it is safe and accurate, Zorvia gives written form cues instead." },
      { property: "og:title", content: "AI Form Check (Coming Soon) — Zorvia" },
      { property: "og:description", content: "Camera-based form feedback is planned. For now, use Zorvia's written form and safety guidance." },
    ],
  }),
  component: FormCheckPage,
});

function FormCheckPage() {
  return (
    <AppShell title="AI Form Check" subtitle="Coming soon">
      <section className="zv-panel zv-animate-rise p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted">
          <Camera className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-4 font-display text-lg font-bold">Not available yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Camera-based technique analysis is planned, but Zorvia will not ship guesswork about your joints. Until on-device pose analysis is accurate and
          private enough to trust, this screen stays a placeholder.
        </p>
      </section>

      <section className="zv-panel mt-3 p-4">
        <span className="zv-eyebrow">What&apos;s planned</span>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>On-device pose detection, with video never leaving your phone</li>
          <li>Rep counting and tempo feedback for a small set of well-understood movements</li>
          <li>Plain-language cues linked to the same form notes you already see</li>
        </ul>
      </section>

      <section className="zv-panel mt-3 p-4">
        <span className="zv-eyebrow">In the meantime</span>
        <p className="mt-2 text-sm text-muted-foreground">
          Film yourself from the side and compare against the Form, Common mistakes and Safety sections of any exercise. That covers most technique problems.
        </p>
        <Link to="/exercises" className="mt-3 inline-block text-sm text-primary hover:underline">Browse exercise form guides</Link>
      </section>
    </AppShell>
  );
}
