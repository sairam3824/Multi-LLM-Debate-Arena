"use client";

import { useMemo, useState } from "react";
import { Sparkles, Swords, TimerReset } from "lucide-react";

import { ExportMarkdownButton } from "@/components/export-markdown-button";
import { ModelSelector } from "@/components/model-selector";
import { Scoreboard } from "@/components/scoreboard";
import { TranscriptRound } from "@/components/transcript-round";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildDebateMarkdown } from "@/lib/markdown";
import { PRESET_MODEL_OPTIONS } from "@/lib/model-catalog";
import { computeTotals, decideWinner } from "@/lib/judge";
import type { DebateResult, DebateRoundResult, DebateSetupInput, StreamEvent } from "@/lib/types";

function createEmptyRound(roundNumber: number): DebateRoundResult {
  return {
    roundNumber,
    argumentA: "",
    argumentB: "",
    judgeRaw: "",
    judge: {
      a: {
        coherence: { score: 0, justification: "" },
        evidence: { score: 0, justification: "" },
        rhetoric: { score: 0, justification: "" }
      },
      b: {
        coherence: { score: 0, justification: "" },
        evidence: { score: 0, justification: "" },
        rhetoric: { score: 0, justification: "" }
      },
      winner: "TIE",
      summary: ""
    }
  };
}

function withPendingJudge(round: DebateRoundResult): DebateRoundResult {
  if (round.judge.summary || round.judgeRaw) {
    return round;
  }

  return {
    ...round,
    judge: {
      ...round.judge,
      summary: "Judge is still scoring this round."
    }
  };
}

async function readSseStream(
  response: Response,
  onEvent: (event: StreamEvent) => void
) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Streaming response was not readable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      const eventName = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
      const dataLine = lines.find((line) => line.startsWith("data:"));

      if (!eventName || !dataLine) {
        continue;
      }

      const payload = JSON.parse(dataLine.replace("data:", "").trim()) as StreamEvent;
      onEvent(payload);
    }
  }
}

const initialModels = {
  debaterA: PRESET_MODEL_OPTIONS[0],
  debaterB: PRESET_MODEL_OPTIONS[2],
  judge: PRESET_MODEL_OPTIONS[3]
};

export function DebateArena() {
  const [setup, setSetup] = useState<DebateSetupInput>({
    claim: "Open-source foundation models are better for society than closed models.",
    rounds: 3,
    maxWordsPerTurn: 180,
    debaterA: initialModels.debaterA,
    debaterB: initialModels.debaterB,
    judge: initialModels.judge
  });
  const [isRunning, setIsRunning] = useState(false);
  const [rounds, setRounds] = useState<DebateRoundResult[]>([]);
  const [debateId, setDebateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<DebateResult | null>(null);

  const totals = useMemo(() => computeTotals(rounds), [rounds]);
  const liveWinner = useMemo(() => (rounds.length > 0 ? decideWinner(totals) : undefined), [rounds.length, totals]);

  async function startDebate() {
    setIsRunning(true);
    setError(null);
    setDebateId(null);
    setFinalResult(null);
    setRounds([]);

    try {
      const response = await fetch("/api/debates/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(setup)
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to start debate.");
      }

      await readSseStream(response, (event) => {
        switch (event.type) {
          case "debate-created":
            setDebateId(event.debateId);
            break;
          case "round-start":
            setRounds((current) => [...current, createEmptyRound(event.roundNumber)]);
            break;
          case "token":
            setRounds((current) =>
              current.map((round) => {
                if (round.roundNumber !== event.roundNumber) {
                  return round;
                }

                if (event.speaker === "A") {
                  return { ...round, argumentA: round.argumentA + event.content };
                }

                if (event.speaker === "B") {
                  return { ...round, argumentB: round.argumentB + event.content };
                }

                return { ...round, judgeRaw: round.judgeRaw + event.content };
              })
            );
            break;
          case "speaker-complete":
            if (event.speaker === "judge") {
              setRounds((current) =>
                current.map((round) =>
                  round.roundNumber === event.roundNumber
                    ? { ...round, judgeRaw: event.content }
                    : round
                )
              );
            }
            break;
          case "round-scored":
            setRounds((current) =>
              current.map((round) =>
                round.roundNumber === event.roundNumber
                  ? { ...round, judge: event.judge, judgeRaw: event.judgeRaw }
                  : round
              )
            );
            break;
          case "debate-complete":
            setFinalResult(event.result);
            setRounds(event.result.rounds);
            break;
          case "error":
            setError(event.message);
            break;
        }
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Debate failed.");
    } finally {
      setIsRunning(false);
    }
  }

  const liveMarkdown =
    finalResult?.markdown ||
    (rounds.length
      ? buildDebateMarkdown({
          id: debateId ?? undefined,
          setup,
          rounds,
          totals,
          winner: liveWinner ?? "TIE",
          finalSummary: finalResult?.finalSummary || "This export was generated from the current live transcript."
        })
      : "");

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden bg-white/90">
        <CardHeader className="border-b border-border/70 bg-slate-950 text-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge className="bg-cyan-400/20 text-cyan-100" variant="outline">
                Setup
              </Badge>
              <CardTitle className="text-3xl">Configure the Arena</CardTitle>
              <CardDescription className="max-w-2xl text-slate-300">
                Pick the claim, lineup, round count, and verbosity. The server streams every token while the judge keeps a running scorecard.
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <ExportMarkdownButton claim={setup.claim} markdown={liveMarkdown} disabled={!rounds.length} />
              <Button
                variant="secondary"
                onClick={() => {
                  setRounds([]);
                  setFinalResult(null);
                  setError(null);
                  setDebateId(null);
                }}
              >
                <TimerReset className="h-4 w-4" />
                Reset Board
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <Label htmlFor="claim">Contested claim</Label>
            <Textarea
              id="claim"
              className="min-h-[140px] text-base leading-7"
              value={setup.claim}
              onChange={(event) => setSetup((current) => ({ ...current, claim: event.target.value }))}
            />
          </div>

          <div className="grid gap-6">
            <ModelSelector
              label="Debater A"
              value={setup.debaterA}
              onChange={(debaterA) => setSetup((current) => ({ ...current, debaterA }))}
            />
            <ModelSelector
              label="Debater B"
              value={setup.debaterB}
              onChange={(debaterB) => setSetup((current) => ({ ...current, debaterB }))}
            />
            <ModelSelector
              label="Judge"
              value={setup.judge}
              onChange={(judge) => setSetup((current) => ({ ...current, judge }))}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rounds">Rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  min={1}
                  max={5}
                  value={setup.rounds}
                  onChange={(event) =>
                    setSetup((current) => ({
                      ...current,
                      rounds: Math.max(1, Math.min(5, Number(event.target.value) || 1))
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxWordsPerTurn">Max words / turn</Label>
                <Input
                  id="maxWordsPerTurn"
                  type="number"
                  min={40}
                  max={500}
                  value={setup.maxWordsPerTurn}
                  onChange={(event) =>
                    setSetup((current) => ({
                      ...current,
                      maxWordsPerTurn: Math.max(40, Math.min(500, Number(event.target.value) || 40))
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              API keys stay server-side through `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and `OPENROUTER_API_KEY`. The client only sees streamed debate events.
            </div>

            <Button className="h-12 text-base" disabled={isRunning || !setup.claim.trim()} onClick={startDebate}>
              <Swords className="h-4 w-4" />
              {isRunning ? "Debate in Progress..." : "Start Debate"}
            </Button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {debateId ? <p className="text-xs text-muted-foreground">Saved debate ID: {debateId}</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          {rounds.length === 0 ? (
            <Card className="border-dashed bg-white/70">
              <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                <Sparkles className="h-10 w-10 text-cyan-700" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold">No debate transcript yet</p>
                  <p className="max-w-lg text-sm text-muted-foreground">
                    Once the arena starts, arguments appear live in two columns and judge output streams in immediately after each round.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            rounds.map((round) => (
              <TranscriptRound
                key={round.roundNumber}
                round={withPendingJudge(round)}
              />
            ))
          )}
        </div>

        <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <Scoreboard totals={totals} winner={finalResult?.winner ?? liveWinner} />

          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle className="text-lg">Lineup</CardTitle>
              <CardDescription>Quick reference for the current matchup and scoring constraints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <p className="font-medium text-cyan-900">Debater A</p>
                <p className="mt-1 text-cyan-950">{setup.debaterA.label}</p>
                <p className="text-xs text-cyan-900/70">{setup.debaterA.modelId}</p>
              </div>
              <div className="rounded-xl bg-orange-500/10 p-3">
                <p className="font-medium text-orange-900">Debater B</p>
                <p className="mt-1 text-orange-950">{setup.debaterB.label}</p>
                <p className="text-xs text-orange-900/70">{setup.debaterB.modelId}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-3 text-slate-50">
                <p className="font-medium">Judge</p>
                <p className="mt-1">{setup.judge.label}</p>
                <p className="text-xs text-slate-400">{setup.judge.modelId}</p>
              </div>
              <div className="rounded-xl border border-border bg-slate-50 p-3">
                <p>Rounds: {setup.rounds}</p>
                <p>Max words/turn: {setup.maxWordsPerTurn}</p>
              </div>
            </CardContent>
          </Card>

          {finalResult ? (
            <Card className="bg-emerald-50/90">
              <CardHeader>
                <CardTitle className="text-lg">Final Verdict</CardTitle>
                <CardDescription>The aggregate scoring determines the winner after all rounds finish.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-2xl font-semibold text-emerald-900">{finalResult.winner}</p>
                <p className="leading-7 text-emerald-950">{finalResult.finalSummary}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
