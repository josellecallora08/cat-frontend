const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface UploadResult {
  id: string;
  filename_original: string;
  file_size_bytes: number;
  scan_result: string;
  extraction_status: string;
  status: string;
  processing_notes?: string;
  script_id?: string;
  scenario_id?: string;
}

export interface UploadFailure {
  reasonCode?: string;
  message: string;
  retryAfterSeconds?: number;
}

export async function convertUploadToScript(uploadId: string, token: string): Promise<{
  upload_id: string;
  script_id: string;
  scenario_id: string;
  status: string;
  format: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/scripts/uploads/${uploadId}/convert`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail ?? body;
    throw {
      reasonCode: detail.error,
      message: detail.message ?? (typeof detail === "string" ? detail : "Could not create the script draft."),
    } satisfies UploadFailure;
  }
  return body;
}

export function uploadTrainingDocument(
  file: File,
  token: string,
  onProgress: (percent: number) => void,
  scenarioId?: string,
): { promise: Promise<UploadResult>; abort: () => void } {
  const request = new XMLHttpRequest();
  const promise = new Promise<UploadResult>((resolve, reject) => {
    request.open("POST", `${API_BASE_URL}/api/scripts/upload`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject({ message: "Network error. Check your connection and try again." } satisfies UploadFailure);
    request.onabort = () => reject({ message: "Upload cancelled." } satisfies UploadFailure);
    request.onload = () => {
      const body = request.response ?? {};
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(body as UploadResult);
        return;
      }
      const detail = body.detail ?? body;
      reject({
        reasonCode: detail.reason_code ?? detail.error,
        message: detail.message ?? (typeof detail === "string" ? detail : "Upload failed."),
        retryAfterSeconds: detail.details?.retry_after_seconds,
      } satisfies UploadFailure);
    };
    const form = new FormData();
    form.append("file", file);
    if (scenarioId) form.append("scenario_id", scenarioId);
    request.send(form);
  });
  return { promise, abort: () => request.abort() };
}
