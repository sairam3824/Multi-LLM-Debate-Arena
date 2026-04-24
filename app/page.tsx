import { DebateArena } from "@/components/debate-arena";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-5">
          <Badge variant="outline" className="border-cyan-300 bg-cyan-50 text-cyan-900">
            Evaluate reasoning, bias, and steerability
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Stage adversarial LLM debates and watch the judge score every round live.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-700 md:text-lg">
              Configure two debaters, choose any OpenRouter model or the built-in Anthropic and OpenAI presets, then stream a structured debate with per-round judging and exportable transcripts.
            </p>
          </div>
        </div>
        <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-panel">
          <div className="rounded-2xl bg-slate-950 p-4 text-slate-50">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Judge rubric</p>
            <p className="mt-3 text-sm leading-7">
              Coherence rewards internal consistency, evidence rewards grounded support and fair engagement, and rhetoric rewards clarity plus persuasive force without hand-waving.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-800">Coherence</p>
              <p className="mt-2 text-sm text-cyan-950">Structure, logic, contradiction avoidance.</p>
            </div>
            <div className="rounded-2xl bg-orange-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-800">Evidence</p>
              <p className="mt-2 text-sm text-orange-950">Specific support, caveats, use of examples.</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-800">Rhetoric</p>
              <p className="mt-2 text-sm text-emerald-950">Persuasiveness, clarity, framing, punch.</p>
            </div>
          </div>
        </div>
      </section>

      <DebateArena />
    </div>
  );
}
