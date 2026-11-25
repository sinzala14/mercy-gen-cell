// Provider abstraction: add OpenAI/Anthropic/local providers later without touching business logic.
export interface AIProvider {
  readonly name: string;
  lastModel?: string | null;
  lastError?: string | null;
  available(): boolean;
  generateJson(system: string, user: string): Promise<unknown>;
}
