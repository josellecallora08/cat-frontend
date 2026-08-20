const MP3_MIME_TYPE = "audio/mpeg";

function abortError(): DOMException {
  return new DOMException("Audio playback was aborted", "AbortError");
}

function waitForSourceOpen(
  mediaSource: MediaSource,
  audio: HTMLAudioElement,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      mediaSource.removeEventListener("sourceopen", handleOpen);
      audio.removeEventListener("error", handleError);
      signal.removeEventListener("abort", handleAbort);
    };
    const handleOpen = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("The streaming audio source could not be opened"));
    };
    const handleAbort = () => {
      cleanup();
      reject(abortError());
    };

    mediaSource.addEventListener("sourceopen", handleOpen, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

function appendChunk(
  sourceBuffer: SourceBuffer,
  chunk: Uint8Array,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      sourceBuffer.removeEventListener("updateend", handleUpdateEnd);
      sourceBuffer.removeEventListener("error", handleError);
      signal.removeEventListener("abort", handleAbort);
    };
    const handleUpdateEnd = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("A streamed audio chunk could not be decoded"));
    };
    const handleAbort = () => {
      cleanup();
      reject(abortError());
    };

    sourceBuffer.addEventListener("updateend", handleUpdateEnd, { once: true });
    sourceBuffer.addEventListener("error", handleError, { once: true });
    signal.addEventListener("abort", handleAbort, { once: true });
    // ReadableStream chunks may be typed over SharedArrayBuffer; MediaSource
    // accepts an owned ArrayBuffer, so copy this network chunk before appending.
    sourceBuffer.appendBuffer(Uint8Array.from(chunk).buffer);
  });
}

function waitForPlaybackEnd(audio: HTMLAudioElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      signal.removeEventListener("abort", handleAbort);
    };
    const handleEnded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      resolve();
    };
    const handleAbort = () => {
      cleanup();
      audio.pause();
      reject(abortError());
    };

    audio.addEventListener("ended", handleEnded, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

/** Play a fetch response as its MP3 chunks arrive instead of waiting for a Blob. */
export async function playStreamingMp3(
  response: Response,
  signal: AbortSignal,
  onAudioCreated: (audio: HTMLAudioElement) => void
): Promise<void> {
  if (!response.body) throw new Error("Streaming response body is unavailable");
  if (typeof MediaSource === "undefined" || !MediaSource.isTypeSupported(MP3_MIME_TYPE)) {
    throw new Error("Progressive MP3 playback is unsupported");
  }

  const mediaSource = new MediaSource();
  const audio = new Audio();
  const objectUrl = URL.createObjectURL(mediaSource);
  const reader = response.body.getReader();
  let playbackStarted = false;

  audio.src = objectUrl;
  onAudioCreated(audio);

  try {
    await waitForSourceOpen(mediaSource, audio, signal);
    const sourceBuffer = mediaSource.addSourceBuffer(MP3_MIME_TYPE);
    const playbackEnded = waitForPlaybackEnd(audio, signal);
    // Attach a handler immediately so an abort during download cannot surface
    // as an unhandled rejection before the stream loop reaches this promise.
    void playbackEnded.catch(() => undefined);

    while (true) {
      if (signal.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (done) break;
      if (!value.byteLength) continue;

      await appendChunk(sourceBuffer, value, signal);
      if (!playbackStarted) {
        await audio.play();
        playbackStarted = true;
      }
    }

    if (!playbackStarted) throw new Error("The TTS stream returned no audio");
    if (mediaSource.readyState === "open" && !sourceBuffer.updating) {
      mediaSource.endOfStream();
    }
    await playbackEnded;
  } finally {
    await reader.cancel().catch(() => undefined);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(objectUrl);
  }
}
