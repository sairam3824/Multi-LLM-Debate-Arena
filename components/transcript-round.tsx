import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DebateRoundResult } from "@/lib/types";

type TranscriptRoundProps = {
  round: DebateRoundResult;
};

function ScoreLine({
  label,
  score,
  justification
}: {
  label: string;
  score: number;
  justification: string;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/70 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{score}</p>
      <p className="mt-1 text-sm text-muted-foreground">{justification}</p>
    </div>
  );
}

export function TranscriptRound({ round }: TranscriptRoundProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-slate-950 text-slate-50">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Round {round.roundNumber}</CardTitle>
          <Badge variant="secondary">Judge winner: {round.judge.winner}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-border/70 bg-cyan-500/5 p-6 md:border-b-0 md:border-r">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Debater A</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-800">{round.argumentA}</p>
          </div>
          <div className="bg-orange-500/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-700">Debater B</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-800">{round.argumentB}</p>
          </div>
        </div>

        <div className="px-6">
          <Separator />
        </div>

        <div className="space-y-4 px-6 pb-6">
          <div className="rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-200">{round.judge.summary}</div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-cyan-800">Judge on Debater A</p>
              <div className="grid gap-3 md:grid-cols-3">
                <ScoreLine
                  label="Coherence"
                  score={round.judge.a.coherence.score}
                  justification={round.judge.a.coherence.justification}
                />
                <ScoreLine
                  label="Evidence"
                  score={round.judge.a.evidence.score}
                  justification={round.judge.a.evidence.justification}
                />
                <ScoreLine
                  label="Rhetoric"
                  score={round.judge.a.rhetoric.score}
                  justification={round.judge.a.rhetoric.justification}
                />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-orange-800">Judge on Debater B</p>
              <div className="grid gap-3 md:grid-cols-3">
                <ScoreLine
                  label="Coherence"
                  score={round.judge.b.coherence.score}
                  justification={round.judge.b.coherence.justification}
                />
                <ScoreLine
                  label="Evidence"
                  score={round.judge.b.evidence.score}
                  justification={round.judge.b.evidence.justification}
                />
                <ScoreLine
                  label="Rhetoric"
                  score={round.judge.b.rhetoric.score}
                  justification={round.judge.b.rhetoric.justification}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
