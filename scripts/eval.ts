#!/usr/bin/env tsx

import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { PRESET_MODEL_OPTIONS } from "../lib/model-catalog";
import { runDebate } from "../lib/debate-engine";
import type { DebateResult, DebateSetupInput, ModelSelection } from "../lib/types";

type CliOptions = {
  input: string;
  runs: number;
  rounds: number;
  maxWords: number;
  debaterA: ModelSelection;
  debaterB: ModelSelection;
  judge: ModelSelection;
  persist: boolean;
  out?: string;
};

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      args.set(value, "true");
      continue;
    }

    args.set(value, nextValue);
    index += 1;
  }

  return args;
}

function normalizePresetName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function resolveModelArg(value: string | undefined, fallback: ModelSelection) {
  if (!value) {
    return fallback;
  }

  const preset = PRESET_MODEL_OPTIONS.find(
    (option) =>
      normalizePresetName(option.label) === normalizePresetName(value) ||
      `${option.provider}:${option.modelId}` === value
  );

  if (preset) {
    return preset;
  }

  const firstSeparator = value.indexOf(":");
  if (firstSeparator === -1) {
    throw new Error(
      `Invalid model value "${value}". Use a preset label or provider:modelId, for example openai:gpt-4o or openrouter:anthropic/claude-sonnet-4.`
    );
  }

  const provider = value.slice(0, firstSeparator) as ModelSelection["provider"];
  const modelId = value.slice(firstSeparator + 1);

  if (!["anthropic", "openai", "openrouter"].includes(provider) || !modelId) {
    throw new Error(`Invalid model value "${value}".`);
  }

  return {
    provider,
    modelId,
    label: modelId,
    source: provider === "openrouter" ? "custom" : "preset"
  } satisfies ModelSelection;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(cell);
      if (row.some((entry) => entry.trim().length > 0)) {
        rows.push(row.map((entry) => entry.trim()));
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((entry) => entry.trim().length > 0)) {
    rows.push(row.map((entry) => entry.trim()));
  }

  return rows;
}

function extractClaims(rows: string[][]) {
  if (rows.length === 0) {
    return [];
  }

  const headerIndex = rows[0].findIndex((cell) => cell.toLowerCase() === "claim");
  if (headerIndex !== -1) {
    return rows.slice(1).map((row) => row[headerIndex]).filter(Boolean);
  }

  return rows.map((row) => row[0]).filter(Boolean);
}

function initializeHistogram() {
  return Object.fromEntries(Array.from({ length: 11 }, (_, score) => [String(score), 0])) as Record<string, number>;
}

function aggregateResults(results: DebateResult[]) {
  const modelStats = new Map<
    string,
    {
      label: string;
      modelId: string;
      asA: { wins: number; losses: number; ties: number; score: number };
      asB: { wins: number; losses: number; ties: number; score: number };
    }
  >();

  const histograms = {
    A: {
      coherence: initializeHistogram(),
      evidence: initializeHistogram(),
      rhetoric: initializeHistogram()
    },
    B: {
      coherence: initializeHistogram(),
      evidence: initializeHistogram(),
      rhetoric: initializeHistogram()
    }
  };

  const byClaim = new Map<
    string,
    { runs: number; winsA: number; winsB: number; ties: number; totalA: number; totalB: number }
  >();

  for (const result of results) {
    const debaterAKey = `${result.setup.debaterA.provider}:${result.setup.debaterA.modelId}`;
    const debaterBKey = `${result.setup.debaterB.provider}:${result.setup.debaterB.modelId}`;

    if (!modelStats.has(debaterAKey)) {
      modelStats.set(debaterAKey, {
        label: result.setup.debaterA.label,
        modelId: result.setup.debaterA.modelId,
        asA: { wins: 0, losses: 0, ties: 0, score: 0 },
        asB: { wins: 0, losses: 0, ties: 0, score: 0 }
      });
    }

    if (!modelStats.has(debaterBKey)) {
      modelStats.set(debaterBKey, {
        label: result.setup.debaterB.label,
        modelId: result.setup.debaterB.modelId,
        asA: { wins: 0, losses: 0, ties: 0, score: 0 },
        asB: { wins: 0, losses: 0, ties: 0, score: 0 }
      });
    }

    const debaterAStats = modelStats.get(debaterAKey)!;
    const debaterBStats = modelStats.get(debaterBKey)!;

    debaterAStats.asA.score += result.totals.a.overall;
    debaterBStats.asB.score += result.totals.b.overall;

    if (result.winner === "A") {
      debaterAStats.asA.wins += 1;
      debaterBStats.asB.losses += 1;
    } else if (result.winner === "B") {
      debaterAStats.asA.losses += 1;
      debaterBStats.asB.wins += 1;
    } else {
      debaterAStats.asA.ties += 1;
      debaterBStats.asB.ties += 1;
    }

    if (!byClaim.has(result.setup.claim)) {
      byClaim.set(result.setup.claim, {
        runs: 0,
        winsA: 0,
        winsB: 0,
        ties: 0,
        totalA: 0,
        totalB: 0
      });
    }

    const claimStats = byClaim.get(result.setup.claim)!;
    claimStats.runs += 1;
    claimStats.totalA += result.totals.a.overall;
    claimStats.totalB += result.totals.b.overall;
    if (result.winner === "A") {
      claimStats.winsA += 1;
    } else if (result.winner === "B") {
      claimStats.winsB += 1;
    } else {
      claimStats.ties += 1;
    }

    for (const round of result.rounds) {
      histograms.A.coherence[String(round.judge.a.coherence.score)] += 1;
      histograms.A.evidence[String(round.judge.a.evidence.score)] += 1;
      histograms.A.rhetoric[String(round.judge.a.rhetoric.score)] += 1;
      histograms.B.coherence[String(round.judge.b.coherence.score)] += 1;
      histograms.B.evidence[String(round.judge.b.evidence.score)] += 1;
      histograms.B.rhetoric[String(round.judge.b.rhetoric.score)] += 1;
    }
  }

  return {
    totalRuns: results.length,
    overallWins: {
      A: results.filter((result) => result.winner === "A").length,
      B: results.filter((result) => result.winner === "B").length,
      TIE: results.filter((result) => result.winner === "TIE").length
    },
    modelPositionStats: Array.from(modelStats.values()),
    byClaim: Array.from(byClaim.entries()).map(([claim, stats]) => ({
      claim,
      runs: stats.runs,
      winsA: stats.winsA,
      winsB: stats.winsB,
      ties: stats.ties,
      averageScoreA: Number((stats.totalA / stats.runs).toFixed(2)),
      averageScoreB: Number((stats.totalB / stats.runs).toFixed(2))
    })),
    scoreHistograms: histograms
  };
}

function formatSummary(summary: ReturnType<typeof aggregateResults>) {
  const lines = [
    "Multi-LLM Debate Arena Eval Summary",
    "",
    `Total runs: ${summary.totalRuns}`,
    `Overall wins: A ${summary.overallWins.A} | B ${summary.overallWins.B} | TIE ${summary.overallWins.TIE}`,
    "",
    "Model position stats:"
  ];

  for (const stat of summary.modelPositionStats) {
    lines.push(
      `- ${stat.label} (${stat.modelId}) as A -> W ${stat.asA.wins} / L ${stat.asA.losses} / T ${stat.asA.ties} / score ${stat.asA.score}`
    );
    lines.push(
      `- ${stat.label} (${stat.modelId}) as B -> W ${stat.asB.wins} / L ${stat.asB.losses} / T ${stat.asB.ties} / score ${stat.asB.score}`
    );
  }

  lines.push("", "Per-claim breakdown:");

  for (const claim of summary.byClaim) {
    lines.push(
      `- ${claim.claim} -> runs ${claim.runs}, A wins ${claim.winsA}, B wins ${claim.winsB}, ties ${claim.ties}, avg score A ${claim.averageScoreA}, avg score B ${claim.averageScoreB}`
    );
  }

  lines.push("", "Score histograms:");
  lines.push(`- A coherence: ${JSON.stringify(summary.scoreHistograms.A.coherence)}`);
  lines.push(`- A evidence: ${JSON.stringify(summary.scoreHistograms.A.evidence)}`);
  lines.push(`- A rhetoric: ${JSON.stringify(summary.scoreHistograms.A.rhetoric)}`);
  lines.push(`- B coherence: ${JSON.stringify(summary.scoreHistograms.B.coherence)}`);
  lines.push(`- B evidence: ${JSON.stringify(summary.scoreHistograms.B.evidence)}`);
  lines.push(`- B rhetoric: ${JSON.stringify(summary.scoreHistograms.B.rhetoric)}`);

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.get("--input");

  if (!input) {
    throw new Error("Missing --input path to a CSV file.");
  }

  const options: CliOptions = {
    input,
    runs: Number(args.get("--runs") ?? "1"),
    rounds: Number(args.get("--rounds") ?? "3"),
    maxWords: Number(args.get("--max-words") ?? "180"),
    debaterA: resolveModelArg(args.get("--debater-a"), PRESET_MODEL_OPTIONS[0]),
    debaterB: resolveModelArg(args.get("--debater-b"), PRESET_MODEL_OPTIONS[2]),
    judge: resolveModelArg(args.get("--judge"), PRESET_MODEL_OPTIONS[3]),
    persist: args.get("--persist") === "true",
    out: args.get("--out") ?? undefined
  };

  const csvPath = path.resolve(process.cwd(), options.input);
  const csvText = await fs.readFile(csvPath, "utf8");
  const claims = extractClaims(parseCsv(csvText));

  if (claims.length === 0) {
    throw new Error("No claims found in the CSV.");
  }

  const results: DebateResult[] = [];

  for (const claim of claims) {
    for (let runIndex = 1; runIndex <= options.runs; runIndex += 1) {
      const setup: DebateSetupInput = {
        claim,
        rounds: options.rounds,
        maxWordsPerTurn: options.maxWords,
        debaterA: options.debaterA,
        debaterB: options.debaterB,
        judge: options.judge
      };

      console.log(`Running debate ${runIndex}/${options.runs} for claim: ${claim}`);
      const result = await runDebate({
        setup,
        persist: options.persist
      });
      results.push(result);
    }
  }

  const summary = aggregateResults(results);
  console.log("");
  console.log(formatSummary(summary));

  if (options.out) {
    const outPath = path.resolve(process.cwd(), options.out);
    await fs.writeFile(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          options,
          summary
        },
        null,
        2
      )
    );
    console.log(`\nWrote aggregate stats to ${outPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
