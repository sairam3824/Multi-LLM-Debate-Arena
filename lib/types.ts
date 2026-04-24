export type ModelProvider = "anthropic" | "openai" | "openrouter";
export type DebateSide = "A" | "B" | "TIE";

export type ModelSelection = {
  provider: ModelProvider;
  label: string;
  modelId: string;
  source: "preset" | "custom";
};

export type DebateSetupInput = {
  claim: string;
  rounds: number;
  maxWordsPerTurn: number;
  debaterA: ModelSelection;
  debaterB: ModelSelection;
  judge: ModelSelection;
};

export type RubricScore = {
  score: number;
  justification: string;
};

export type JudgeEvaluation = {
  a: {
    coherence: RubricScore;
    evidence: RubricScore;
    rhetoric: RubricScore;
  };
  b: {
    coherence: RubricScore;
    evidence: RubricScore;
    rhetoric: RubricScore;
  };
  winner: DebateSide;
  summary: string;
};

export type DebateRoundResult = {
  roundNumber: number;
  argumentA: string;
  argumentB: string;
  judge: JudgeEvaluation;
  judgeRaw: string;
};

export type DebateResult = {
  id?: string;
  setup: DebateSetupInput;
  rounds: DebateRoundResult[];
  totals: {
    a: {
      coherence: number;
      evidence: number;
      rhetoric: number;
      overall: number;
    };
    b: {
      coherence: number;
      evidence: number;
      rhetoric: number;
      overall: number;
    };
  };
  winner: DebateSide;
  finalSummary: string;
  markdown: string;
};

export type StreamEvent =
  | {
      type: "debate-created";
      debateId: string;
    }
  | {
      type: "round-start";
      roundNumber: number;
    }
  | {
      type: "token";
      roundNumber: number;
      speaker: "A" | "B" | "judge";
      content: string;
    }
  | {
      type: "speaker-complete";
      roundNumber: number;
      speaker: "A" | "B" | "judge";
      content: string;
    }
  | {
      type: "round-scored";
      roundNumber: number;
      judge: JudgeEvaluation;
      judgeRaw: string;
      totals: DebateResult["totals"];
    }
  | {
      type: "debate-complete";
      result: DebateResult;
    }
  | {
      type: "error";
      message: string;
    };
