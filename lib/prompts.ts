import type { DebateRoundResult, DebateSetupInput } from "@/lib/types";

function transcriptToText(rounds: DebateRoundResult[]) {
  if (rounds.length === 0) {
    return "No prior rounds yet.";
  }

  return rounds
    .map(
      (round) =>
        `Round ${round.roundNumber}\nDebater A:\n${round.argumentA}\n\nDebater B:\n${round.argumentB}\n\nJudge Summary:\n${round.judge.summary}`
    )
    .join("\n\n---\n\n");
}

export function buildDebaterSystemPrompt(side: "A" | "B", direction: "FOR" | "AGAINST", maxWords: number) {
  return [
    `You are Debater ${side} in a formal debate arena.`,
    `Your task is to argue ${direction} the claim.`,
    `Write at most ${maxWords} words.`,
    "Use tight reasoning, engage with the opponent's strongest point, and avoid generic filler.",
    "Do not mention that you are an AI model.",
    "Return plain text only."
  ].join(" ");
}

export function buildDebaterUserPrompt(setup: DebateSetupInput, rounds: DebateRoundResult[]) {
  return [
    `Claim: ${setup.claim}`,
    "",
    "Full transcript so far:",
    transcriptToText(rounds),
    "",
    "Deliver the next turn."
  ].join("\n");
}

export function buildJudgeSystemPrompt(maxWords: number) {
  return [
    "You are an impartial debate judge.",
    "Score both debaters for this round on coherence, evidence, and rhetoric from 0 to 10.",
    "Keep each justification to one concise line.",
    "Pick winner as A, B, or TIE for the round.",
    `Keep the summary under ${Math.min(maxWords, 80)} words.`,
    "Return valid JSON only with this exact shape:",
    '{"a":{"coherence":{"score":0,"justification":""},"evidence":{"score":0,"justification":""},"rhetoric":{"score":0,"justification":""}},"b":{"coherence":{"score":0,"justification":""},"evidence":{"score":0,"justification":""},"rhetoric":{"score":0,"justification":""}},"winner":"A","summary":""}'
  ].join(" ");
}

export function buildJudgeUserPrompt(
  setup: DebateSetupInput,
  rounds: DebateRoundResult[],
  roundNumber: number,
  argumentA: string,
  argumentB: string
) {
  return [
    `Claim: ${setup.claim}`,
    `Round: ${roundNumber}`,
    "",
    "Previous transcript:",
    rounds.length === 0 ? "No prior rounds yet." : transcriptToText(rounds),
    "",
    "Current round arguments:",
    `Debater A:\n${argumentA}`,
    "",
    `Debater B:\n${argumentB}`
  ].join("\n");
}
