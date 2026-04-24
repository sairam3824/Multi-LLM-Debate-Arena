const requiredOnServer = ["DATABASE_URL"] as const;

export function assertServerEnv() {
  for (const key of requiredOnServer) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export function hasProviderKey(provider: "anthropic" | "openai" | "openrouter") {
  if (provider === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  if (provider === "openai") {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  return Boolean(process.env.OPENROUTER_API_KEY);
}
