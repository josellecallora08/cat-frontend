export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ArtifactErrorCategory =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "request"
  | "server"
  | "network"
  | "decode"
  | "validation";

export interface ArtifactErrorMessages {
  notFound?: string;
  request?: string;
  server?: string;
  network?: string;
  decode?: string;
  validation?: string;
  conflict?: string;
}

export interface ArtifactRequestOptions {
  init?: RequestInit;
  messages?: ArtifactErrorMessages;
}

export interface ArtifactBlobProgress {
  loaded: number;
  total: number | null;
}

export interface ArtifactBlobResponse {
  blob: Blob;
  headers: Headers;
}

export interface ArtifactBlobRequestOptions extends ArtifactRequestOptions {
  onProgress?: (progress: ArtifactBlobProgress) => void;
}

export class SessionArtifactError extends Error {
  readonly category: ArtifactErrorCategory;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    category: ArtifactErrorCategory,
    message: string,
    options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "SessionArtifactError";
    this.category = category;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

export type ArtifactParser<T> = (payload: unknown) => T;

export function getArtifactToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage?.getItem("cat_token") ?? null;
  } catch {
    return null;
  }
}

export function createArtifactHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = includeContentType
    ? { "Content-Type": "application/json" }
    : {};
  const token = getArtifactToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// Alias retained for callers that describe this operation as header building.
export const buildArtifactHeaders = createArtifactHeaders;

function artifactLabel(artifact: string): string {
  return artifact.charAt(0).toUpperCase() + artifact.slice(1);
}

export function safeStatusError(
  artifact: string,
  status: number,
  messages: ArtifactErrorMessages = {},
): SessionArtifactError {
  const label = artifactLabel(artifact).toLowerCase();
  if (status === 401) {
    return new SessionArtifactError(
      "unauthorized",
      "Sign in again to view this result",
      { status },
    );
  }
  if (status === 403) {
    return new SessionArtifactError(
      "forbidden",
      "You do not have access to this session",
      { status },
    );
  }
  if (status === 404) {
    return new SessionArtifactError(
      "not_found",
      messages.notFound ?? (artifact === "report" ? "This report is not available" : "This artifact is not available"),
      { status },
    );
  }
  if (status >= 500 && status <= 599) {
    return new SessionArtifactError(
      "server",
      messages.server ?? `Unable to load the ${label} right now. Please try again.`,
      { status, retryable: true },
    );
  }
  return new SessionArtifactError(
    "request",
    status === 409 && messages.conflict
      ? messages.conflict
      : messages.request ?? `Unable to load the ${label}. Please try again.`,
    { status },
  );
}

export async function decodeArtifactResponse<T>(
  response: Response,
  artifact: string,
  parse: ArtifactParser<T>,
  messages: ArtifactErrorMessages = {},
): Promise<T> {
  // Check status before reading the body so failed responses cannot become UI data.
  if (!response.ok) throw safeStatusError(artifact, response.status, messages);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SessionArtifactError(
      "decode",
      messages.decode ?? `Unable to read the ${artifact.toLowerCase()} response. Please try again.`,
      { retryable: true },
    );
  }

  try {
    return parse(payload);
  } catch {
    throw new SessionArtifactError(
      "validation",
      messages.validation ?? `${artifactLabel(artifact)} response is invalid. Please try again.`,
    );
  }
}

export async function requestArtifact<T>(
  artifact: string,
  path: string,
  parse: ArtifactParser<T>,
  options: ArtifactRequestOptions = {},
): Promise<T> {
  const init = options.init ?? {};
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method: init.method ?? "GET",
      headers: {
        ...createArtifactHeaders(true),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new SessionArtifactError(
      "network",
      options.messages?.network ?? `Unable to load the ${artifact.toLowerCase()} right now. Please try again.`,
      { retryable: true },
    );
  }
  return decodeArtifactResponse(response, artifact, parse, options.messages);
}

export async function requestArtifactBlobResponse(
  artifact: string,
  path: string,
  options: ArtifactBlobRequestOptions = {},
): Promise<ArtifactBlobResponse> {
  const init = options.init ?? {};
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method: init.method ?? "GET",
      headers: {
        ...createArtifactHeaders(false),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch (error) {
    // Preserve AbortController cancellation for callers that own the request lifecycle.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new SessionArtifactError(
      "network",
      options.messages?.network ?? `Unable to download the ${artifact.toLowerCase()} right now. Please try again.`,
      { retryable: true },
    );
  }

  // Do not call blob() or read a stream until status mapping has rejected unsuccessful responses.
  if (!response.ok) throw safeStatusError(artifact, response.status, options.messages);

  const contentLength = Number(response.headers.get("Content-Length"));
  const total = Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : null;
  try {
    if (!response.body) {
      const blob = await response.blob();
      options.onProgress?.({ loaded: blob.size, total: total ?? blob.size });
      if (blob.size === 0) {
        throw new SessionArtifactError(
          "decode",
          options.messages?.decode ?? `Unable to read the ${artifact.toLowerCase()} response. Please try again.`,
        );
      }
      return { blob, headers: response.headers };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    options.onProgress?.({ loaded, total });
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      if (result.value) {
        chunks.push(result.value);
        loaded += result.value.byteLength;
        options.onProgress?.({ loaded, total });
      }
    }
    const parts: BlobPart[] = chunks.map((chunk) => {
      const copy = new ArrayBuffer(chunk.byteLength);
      new Uint8Array(copy).set(chunk);
      return copy;
    });
    const blob = new Blob(parts);
    // A successful response is not a usable download until the assembled blob
    // contains bytes. Check the final artifact as well as the stream counter so
    // browser implementations that emit empty chunks cannot cross this boundary.
    if (loaded === 0 || blob.size === 0) {
      throw new SessionArtifactError(
        "decode",
        options.messages?.decode ?? `Unable to read the ${artifact.toLowerCase()} response. Please try again.`,
      );
    }
    return { blob, headers: response.headers };
  } catch (error) {
    if (error instanceof SessionArtifactError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new SessionArtifactError(
      "decode",
      options.messages?.decode ?? `Unable to read the ${artifact.toLowerCase()} response. Please try again.`,
      { retryable: true },
    );
  }
}

export async function requestArtifactBlob(
  artifact: string,
  path: string,
  options: ArtifactBlobRequestOptions = {},
): Promise<Blob> {
  const result = await requestArtifactBlobResponse(artifact, path, options);
  return result.blob;
}
