import type { DebateSide, JudgeEvaluation } from "@/lib/types";

function coerceScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(10, Math.round(numeric)));
}

function coerceWinner(value: unknown): DebateSide {
  if (value === "A" || value === "B" || value === "TIE") {
    return value;
  }

  return "TIE";
}

export function extractJsonObject(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Judge response did not contain JSON.");
  }

  return raw.slice(start, end + 1);
}

export function parseJudgeEvaluation(raw: string): JudgeEvaluation {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<JudgeEvaluation>;

  return {
    a: {
      coherence: {
        score: coerceScore(parsed.a?.coherence?.score),
        justification: parsed.a?.coherence?.justification?.trim() || "No justification provided."
      },
      evidence: {
        score: coerceScore(parsed.a?.evidence?.score),
        justification: parsed.a?.evidence?.justification?.trim() || "No justification provided."
      },
      rhetoric: {
        score: coerceScore(parsed.a?.rhetoric?.score),
        justification: parsed.a?.rhetoric?.justification?.trim() || "No justification provided."
      }
    },
    b: {
      coherence: {
        score: coerceScore(parsed.b?.coherence?.score),
        justification: parsed.b?.coherence?.justification?.trim() || "No justification provided."
      },
      evidence: {
        score: coerceScore(parsed.b?.evidence?.score),
        justification: parsed.b?.evidence?.justification?.trim() || "No justification provided."
      },
      rhetoric: {
        score: coerceScore(parsed.b?.rhetoric?.score),
        justification: parsed.b?.rhetoric?.justification?.trim() || "No justification provided."
      }
    },
    winner: coerceWinner(parsed.winner),
    summary: parsed.summary?.trim() || "Judge summary unavailable."
  };
}

export function computeTotals(rounds: { judge: JudgeEvaluation }[]) {
  return rounds.reduce(
    (acc, round) => {
      acc.a.coherence += round.judge.a.coherence.score;
      acc.a.evidence += round.judge.a.evidence.score;
      acc.a.rhetoric += round.judge.a.rhetoric.score;
      acc.b.coherence += round.judge.b.coherence.score;
      acc.b.evidence += round.judge.b.evidence.score;
      acc.b.rhetoric += round.judge.b.rhetoric.score;
      acc.a.overall = acc.a.coherence + acc.a.evidence + acc.a.rhetoric;
      acc.b.overall = acc.b.coherence + acc.b.evidence + acc.b.rhetoric;
      return acc;
    },
    {
      a: { coherence: 0, evidence: 0, rhetoric: 0, overall: 0 },
      b: { coherence: 0, evidence: 0, rhetoric: 0, overall: 0 }
    }
  );
}

export function decideWinner(totals: ReturnType<typeof computeTotals>): DebateSide {
  if (totals.a.overall === totals.b.overall) {
    return "TIE";
  }

  return totals.a.overall > totals.b.overall ? "A" : "B";
}
