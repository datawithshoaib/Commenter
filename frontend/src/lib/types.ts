export type Platform = "linkedin" | "x" | "other";
export type PlatformChoice = "auto" | Platform;
export type Length = "short" | "medium" | "long";
export type Sentiment = "positive" | "neutral" | "negative" | "mixed";
export type RefineAction =
  | "shorter"
  | "longer"
  | "casual"
  | "professional"
  | "add_question"
  | "remove_emojis"
  | "custom";

export interface Post {
  platform: Platform;
  text: string;
  url?: string | null;
  author?: string | null;
  author_handle?: string | null;
  source: "pasted" | "extracted";
}

export interface PostAnalysis {
  topic: string;
  summary: string;
  sentiment: Sentiment;
  author_intent: string;
  key_points: string[];
}

export interface Comment {
  id: string;
  style: string;
  style_name: string;
  text: string;
  rationale: string;
  char_count: number;
}

export interface GenerationOptions {
  platform: PlatformChoice;
  styles: string[];
  length: Length;
  use_emojis: boolean;
  persona?: string | null;
}

export interface GenerateRequest extends GenerationOptions {
  text?: string | null;
  url?: string | null;
}

export interface Health {
  status: string;
  model: string;
  llm_configured: boolean;
}

export type StreamEvent =
  | { event: "post"; data: Post }
  | { event: "analysis"; data: PostAnalysis }
  | { event: "comment"; data: Comment }
  | { event: "comment_error"; data: { style: string; message: string } }
  | { event: "done"; data: { model: string; count: number } }
  | { event: "error"; data: { code: string; message: string } };
