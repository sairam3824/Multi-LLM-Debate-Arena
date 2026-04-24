import type { DebateResult } from "@/lib/types";

export function buildDebateMarkdown(result: Omit<DebateResult, "markdown">) {
  const lines = [
    "# Multi-LLM Debate Arena Transcript",
    "",
    `- Claim: ${result.setup.claim}`,
    `- Debater A: ${result.setup.debaterA.label} (${result.setup.debaterA.modelId})`,
    `- Debater B: ${result.setup.debaterB.label} (${result.setup.debaterB.modelId})`,
    `- Judge: ${result.setup.judge.label} (${result.setup.judge.modelId})`,
    `- Rounds: ${result.setup.rounds}`,
    `- Max words per turn: ${result.setup.maxWordsPerTurn}`,
    "",
    "## Final Tally",
    "",
    `- Winner: ${result.winner}`,
    `- Debater A total: ${result.totals.a.overall} (coherence ${result.totals.a.coherence}, evidence ${result.totals.a.evidence}, rhetoric ${result.totals.a.rhetoric})`,
    `- Debater B total: ${result.totals.b.overall} (coherence ${result.totals.b.coherence}, evidence ${result.totals.b.evidence}, rhetoric ${result.totals.b.rhetoric})`,
    `- Final summary: ${result.finalSummary}`,
    ""
  ];

  for (const round of result.rounds) {
    lines.push(`## Round ${round.roundNumber}`, "");
    lines.push("### Debater A", "", round.argumentA, "");
    lines.push("### Debater B", "", round.argumentB, "");
    lines.push("### Judge", "");
    lines.push(`- Winner: ${round.judge.winner}`);
    lines.push(
      `- A scores: coherence ${round.judge.a.coherence.score}, evidence ${round.judge.a.evidence.score}, rhetoric ${round.judge.a.rhetoric.score}`
    );
    lines.push(`- A coherence note: ${round.judge.a.coherence.justification}`);
    lines.push(`- A evidence note: ${round.judge.a.evidence.justification}`);
    lines.push(`- A rhetoric note: ${round.judge.a.rhetoric.justification}`);
    lines.push(
      `- B scores: coherence ${round.judge.b.coherence.score}, evidence ${round.judge.b.evidence.score}, rhetoric ${round.judge.b.rhetoric.score}`
    );
    lines.push(`- B coherence note: ${round.judge.b.coherence.justification}`);
    lines.push(`- B evidence note: ${round.judge.b.evidence.justification}`);
    lines.push(`- B rhetoric note: ${round.judge.b.rhetoric.justification}`);
    lines.push(`- Summary: ${round.judge.summary}`, "");
  }

  return lines.join("\n");
}
