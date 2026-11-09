import type {
  Comment,
  GenerateRequest,
  Health,
  Length,
  Post,
  PostAnalysis,
  RefineAction,
  StreamEvent,
} from "@/lib/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string = "unknown",
    public status = 0,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error?.message) return new ApiError(body.error.message, body.error.code, res.status);
    if (typeof body?.detail === "string") return new ApiError(body.detail, "http_error", res.status);
  } catch {
    // fall through
  }
  return new ApiError(`Request failed (${res.status})`, "http_error", res.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(`Can't reach the API at ${API_URL}. Is the backend running?`, "network_error");
  }
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/api/health", { signal }),

  extract: (url: string, signal?: AbortSignal) =>
    request<Post>("/api/extract", { method: "POST", body: JSON.stringify({ url }), signal }),

  regenerate: (body: {
    post: Post;
    style: string;
    length: Length;
    use_emojis: boolean;
    persona?: string | null;
    analysis?: PostAnalysis | null;
    avoid?: string[];
  }) => request<Comment>("/api/comments/regenerate", { method: "POST", body: JSON.stringify(body) }),

  refine: (body: { post: Post; comment: Comment; action: RefineAction; instruction?: string }) =>
    request<Comment>("/api/comments/refine", { method: "POST", body: JSON.stringify(body) }),
};

/** POST to the SSE endpoint and yield parsed events as they arrive. */
export async function* streamGeneration(body: GenerateRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/generate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(`Can't reach the API at ${API_URL}. Is the backend running?`, "network_error");
  }
  if (!res.ok || !res.body) throw await parseError(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value.replace(/\r\n/g, "\n");
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) yield { event, data: JSON.parse(data.join("\n")) } as StreamEvent;
    }
  }
}
