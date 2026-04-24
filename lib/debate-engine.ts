import { DebateStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { buildDebateMarkdown } from "@/lib/markdown";
import { serializeModelSelection } from "@/lib/model-catalog";
import { computeTotals, decideWinner, parseJudgeEvaluation } from "@/lib/judge";
import {
  buildDebaterSystemPrompt,
  buildDebaterUserPrompt,
  buildJudgeSystemPrompt,
  buildJudgeUserPrompt
} from "@/lib/prompts";
import { streamModelText } from "@/lib/providers";
import type { DebateResult, DebateRoundResult, DebateSetupInput, StreamEvent } from "@/lib/types";

type RunDebateParams = {
  setup: DebateSetupInput;
  onEvent?: (event: StreamEvent) => Promise<void> | void;
  persist?: boolean;
};

async function emit(
  onEvent: RunDebateParams["onEvent"],
  event: StreamEvent
) {
  if (onEvent) {
    await onEvent(event);
  }
}

function getFinalSummary(result: Omit<DebateResult, "finalSummary" | "markdown">) {
  if (result.winner === "TIE") {
    return "The debate ended level on aggregate judging, with both sides showing comparable strength across the rubric.";
  }

  return result.winner === "A"
    ? "Debater A prevailed on aggregate judging with the stronger mix of coherence, evidence handling, and rhetoric."
    : "Debater B prevailed on aggregate judging with the stronger mix of coherence, evidence handling, and rhetoric.";
}

export async function runDebate({
  setup,
  onEvent,
  persist = true
}: RunDebateParams): Promise<DebateResult> {
  const debate =
    persist
      ? await db.debate.create({
          data: {
            claim: setup.claim,
            rounds: setup.rounds,
            maxWordsPerTurn: setup.maxWordsPerTurn,
            debaterAModelLabel: setup.debaterA.label,
            debaterAModelSpec: serializeModelSelection(setup.debaterA),
            debaterBModelLabel: setup.debaterB.label,
            debaterBModelSpec: serializeModelSelection(setup.debaterB),
            judgeModelLabel: setup.judge.label,
            judgeModelSpec: serializeModelSelection(setup.judge),
            status: DebateStatus.RUNNING
          }
        })
      : null;

  if (debate) {
    await emit(onEvent, { type: "debate-created", debateId: debate.id });
  }

  const rounds: DebateRoundResult[] = [];

  try {
    for (let roundNumber = 1; roundNumber <= setup.rounds; roundNumber += 1) {
      await emit(onEvent, { type: "round-start", roundNumber });

      const argumentA = await streamModelText({
        model: setup.debaterA,
        systemPrompt: buildDebaterSystemPrompt("A", "FOR", setup.maxWordsPerTurn),
        userPrompt: buildDebaterUserPrompt(setup, rounds),
        maxOutputTokens: Math.min(setup.maxWordsPerTurn * 3, 1200),
        onToken: (content) =>
          emit(onEvent, { type: "token", roundNumber, speaker: "A", content })
      });

      await emit(onEvent, {
        type: "speaker-complete",
        roundNumber,
        speaker: "A",
        content: argumentA
      });

      const partialRoundForB: DebateRoundResult[] = [
        ...rounds,
        {
          roundNumber,
          argumentA,
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
        }
      ];

      const argumentB = await streamModelText({
        model: setup.debaterB,
        systemPrompt: buildDebaterSystemPrompt("B", "AGAINST", setup.maxWordsPerTurn),
        userPrompt: buildDebaterUserPrompt(setup, partialRoundForB),
        maxOutputTokens: Math.min(setup.maxWordsPerTurn * 3, 1200),
        onToken: (content) =>
          emit(onEvent, { type: "token", roundNumber, speaker: "B", content })
      });

      await emit(onEvent, {
        type: "speaker-complete",
        roundNumber,
        speaker: "B",
        content: argumentB
      });

      const judgeRaw = await streamModelText({
        model: setup.judge,
        systemPrompt: buildJudgeSystemPrompt(setup.maxWordsPerTurn),
        userPrompt: buildJudgeUserPrompt(setup, rounds, roundNumber, argumentA, argumentB),
        maxOutputTokens: 900,
        temperature: 0.2,
        onToken: (content) =>
          emit(onEvent, { type: "token", roundNumber, speaker: "judge", content })
      });

      await emit(onEvent, {
        type: "speaker-complete",
        roundNumber,
        speaker: "judge",
        content: judgeRaw
      });

      const judge = parseJudgeEvaluation(judgeRaw);
      const round: DebateRoundResult = {
        roundNumber,
        argumentA,
        argumentB,
        judge,
        judgeRaw
      };

      rounds.push(round);

      if (debate) {
        await db.debateRound.create({
          data: {
            debateId: debate.id,
            roundNumber,
            argumentA,
            argumentB,
            judgeNarrative: judge.summary,
            winner: judge.winner,
            coherenceA: judge.a.coherence.score,
            evidenceA: judge.a.evidence.score,
            rhetoricA: judge.a.rhetoric.score,
            coherenceB: judge.b.coherence.score,
            evidenceB: judge.b.evidence.score,
            rhetoricB: judge.b.rhetoric.score,
            coherenceJustificationA: judge.a.coherence.justification,
            evidenceJustificationA: judge.a.evidence.justification,
            rhetoricJustificationA: judge.a.rhetoric.justification,
            coherenceJustificationB: judge.b.coherence.justification,
            evidenceJustificationB: judge.b.evidence.justification,
            rhetoricJustificationB: judge.b.rhetoric.justification
          }
        });
      }

      await emit(onEvent, {
        type: "round-scored",
        roundNumber,
        judge,
        judgeRaw,
        totals: computeTotals(rounds)
      });
    }

    const totals = computeTotals(rounds);
    const winner = decideWinner(totals);
    const partialResult = {
      id: debate?.id,
      setup,
      rounds,
      totals,
      winner
    };
    const finalSummary = getFinalSummary(partialResult);
    const markdown = buildDebateMarkdown({
      ...partialResult,
      finalSummary
    });
    const result: DebateResult = {
      ...partialResult,
      finalSummary,
      markdown
    };

    if (debate) {
      await db.debate.update({
        where: { id: debate.id },
        data: {
          status: DebateStatus.COMPLETED,
          finalWinner: winner,
          finalSummary,
          markdownTranscript: markdown,
          totalCoherenceA: totals.a.coherence,
          totalEvidenceA: totals.a.evidence,
          totalRhetoricA: totals.a.rhetoric,
          totalCoherenceB: totals.b.coherence,
          totalEvidenceB: totals.b.evidence,
          totalRhetoricB: totals.b.rhetoric,
          completedAt: new Date()
        }
      });
    }

    await emit(onEvent, { type: "debate-complete", result });
    return result;
  } catch (error) {
    if (debate) {
      await db.debate.update({
        where: { id: debate.id },
        data: {
          status: DebateStatus.FAILED,
          completedAt: new Date()
        }
      });
    }

    const message = error instanceof Error ? error.message : "Debate failed unexpectedly.";
    await emit(onEvent, { type: "error", message });
    throw error;
  }
}
