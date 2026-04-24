import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DebateResult } from "@/lib/types";

type ScoreboardProps = {
  totals: DebateResult["totals"];
  winner?: DebateResult["winner"];
};

export function Scoreboard({ totals, winner }: ScoreboardProps) {
  return (
    <Card className="bg-slate-950/85 text-slate-50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Running Totals</CardTitle>
        {winner ? <Badge variant="secondary">Leader: {winner}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Debater A</p>
          <p className="mt-3 text-3xl font-semibold">{totals.a.overall}</p>
          <p className="mt-2 text-sm text-slate-300">
            Coherence {totals.a.coherence} · Evidence {totals.a.evidence} · Rhetoric {totals.a.rhetoric}
          </p>
        </div>
        <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Debater B</p>
          <p className="mt-3 text-3xl font-semibold">{totals.b.overall}</p>
          <p className="mt-2 text-sm text-slate-300">
            Coherence {totals.b.coherence} · Evidence {totals.b.evidence} · Rhetoric {totals.b.rhetoric}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
