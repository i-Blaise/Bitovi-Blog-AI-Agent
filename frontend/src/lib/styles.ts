export const CATEGORY_STYLES: Record<string, { dot: string }> = {
  DevOps: { dot: "#e0a830" },
  React: { dot: "#5b9ff0" },
  AI: { dot: "#3fb6a8" },
  Testing: { dot: "#d98b5f" },
  CanJS: { dot: "#e63329" },
  Angular: { dot: "#dd4b39" },
  Temporal: { dot: "#b16ad0" },
};

export interface ExampleQuestion {
  text: string;
  icon: "Newspaper" | "Server" | "Sparkles" | "FlaskConical";
}

export const EXAMPLE_QUESTIONS: ExampleQuestion[] = [
  { text: "What is Bitovi's latest blog post about?", icon: "Newspaper" },
  { text: "Show me all Bitovi articles about DevOps", icon: "Server" },
  { text: "How many articles does Bitovi have about AI?", icon: "Sparkles" },
  { text: "What testing tools does Bitovi recommend?", icon: "FlaskConical" },
];

// Best-effort client-side category derivation from a source's title or URL.
export function deriveCategory(title: string, url: string): string {
  const haystack = `${title} ${url}`.toLowerCase();
  if (/\bdevops\b|cicd|ci\/cd|terraform|bitops|kubernetes|helm|ansible/.test(haystack)) return "DevOps";
  if (/\breact\b|jsx|next\.js|nextjs/.test(haystack)) return "React";
  if (/\bangular\b/.test(haystack)) return "Angular";
  if (/\bai\b|llm|gpt|chatgpt|openai|langchain|rag\b/.test(haystack)) return "AI";
  if (/\btest(ing)?\b|cypress|jest|playwright|e2e|qa/.test(haystack)) return "Testing";
  if (/\bcanjs\b/.test(haystack)) return "CanJS";
  if (/\btemporal\b/.test(haystack)) return "Temporal";
  return "Engineering";
}
