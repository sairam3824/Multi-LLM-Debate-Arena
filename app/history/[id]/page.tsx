import { notFound } from "next/navigation";

import { ExportMarkdownButton } from "@/components/export-markdown-button";
import { Scoreboard } from "@/components/scoreboard";
import { TranscriptRound } from "@/components/transcript-round";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { buildDebateMarkdown } from "@/lib/markdown";
import { parseModelSelection } from "@/lib/model-catalog";
import type { DebateRoundResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({
  params
}: {
  params: { id: string };
}) {
  const { id } = params;

  const debate = await db.debate.findUnique({
    where: { id },
    include: {
      roundsData: {
        orderBy: { roundNumber: "asc" }
      }
    }
  });

  if (!debate) {
    notFound();
  }

  const rounds: DebateRoundResult[] = debate.roundsData.map((round) => ({
    roundNumber: round.roundNumber,
    argumentA: round.argumentA,
    argumentB: round.argumentB,
    judgeRaw: round.judgeNarrative,
    judge: {
      a: {
        coherence: { score: round.coherenceA, justification: round.coherenceJustificationA },
        evidence: { score: round.evidenceA, justification: round.evidenceJustificationA },
        rhetoric: { score: round.rhetoricA, justification: round.rhetoricJustificationA }
      },
      b: {
        coherence: { score: round.coherenceB, justification: round.coherenceJustificationB },
        evidence: { score: round.evidenceB, justification: round.evidenceJustificationB },
        rhetoric: { score: round.rhetoricB, justification: round.rhetoricJustificationB }
      },
      winner: round.winner,
      summary: round.judgeNarrative
    }
  }));

  const setup = {
    claim: debate.claim,
    rounds: debate.rounds,
    maxWordsPerTurn: debate.maxWordsPerTurn,
    debaterA: parseModelSelection(debate.debaterAModelSpec),
    debaterB: parseModelSelection(debate.debaterBModelSpec),
    judge: parseModelSelection(debate.judgeModelSpec)
  };

  const markdown =
    debate.markdownTranscript ||
    buildDebateMarkdown({
      id: debate.id,
      setup,
      rounds,
      totals: {
        a: {
          coherence: debate.totalCoherenceA,
          evidence: debate.totalEvidenceA,
          rhetoric: debate.totalRhetoricA,
          overall: debate.totalCoherenceA + debate.totalEvidenceA + debate.totalRhetoricA
        },
        b: {
          coherence: debate.totalCoherenceB,
          evidence: debate.totalEvidenceB,
          rhetoric: debate.totalRhetoricB,
          overall: debate.totalCoherenceB + debate.totalEvidenceB + debate.totalRhetoricB
        }
      },
      winner: debate.finalWinner ?? "TIE",
      finalSummary: debate.finalSummary || "No final summary recorded."
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Badge variant="outline">Saved Debate</Badge>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight">{debate.claim}</h1>
          <p className="text-muted-foreground">
            {debate.debaterAModelLabel} vs {debate.debaterBModelLabel} · Judge {debate.judgeModelLabel}
          </p>
        </div>
        <ExportMarkdownButton claim={debate.claim} markdown={markdown} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          {rounds.map((round) => (
            <TranscriptRound key={round.roundNumber} round={round} />
          ))}
        </div>
        <div className="space-y-6">
          <Scoreboard
            totals={{
              a: {
                coherence: debate.totalCoherenceA,
                evidence: debate.totalEvidenceA,
                rhetoric: debate.totalRhetoricA,
                overall: debate.totalCoherenceA + debate.totalEvidenceA + debate.totalRhetoricA
              },
              b: {
                coherence: debate.totalCoherenceB,
                evidence: debate.totalEvidenceB,
                rhetoric: debate.totalRhetoricB,
                overall: debate.totalCoherenceB + debate.totalEvidenceB + debate.totalRhetoricB
              }
            }}
            winner={debate.finalWinner ?? "TIE"}
          />

          <Card>
            <CardHeader>
              <CardTitle>Verdict</CardTitle>
              <CardDescription>Final summary stored alongside the transcript.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold">{debate.finalWinner ?? debate.status}</p>
              <p className="text-sm leading-7 text-muted-foreground">{debate.finalSummary || "No summary available."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
