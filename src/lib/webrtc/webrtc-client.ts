/**
 * WebRTC client for real-time voice communication with the backend voice pipeline.
 *
 * Handles:
 * - getUserMedia (audio only)
 * - RTCPeerConnection lifecycle
 * - WebSocket signaling (SDP offer/answer, ICE candidates)
 * - Connection state events
 */

export type WebRTCStatus = "connecting" | "active" | "ended" | "error";
export type StatusListener = (status: WebRTCStatus, error?: string) => void;

interface SignalingMessage {
  type: "offer" | "answer" | "ice_candidate" | "error";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  error?: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private webSocket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private statusListener: StatusListener | null = null;
  private sessionId: string;
  private wsUrl: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    const host = typeof window !== "undefined" ? window.location.host : "localhost:8000";
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    this.wsUrl = `${protocol}//${host}/ws/voice/${sessionId}`;
  }

  /**
   * Register a listener for connection status changes.
   */
  onStatusChange(listener: StatusListener): void {
    this.statusListener = listener;
  }

  /**
   * Initiate the WebRTC connection:
   * 1. Get user media (audio only)
   * 2. Create RTCPeerConnection
   * 3. Open WebSocket for signaling
   * 4. Create and send SDP offer
   */
  async connect(): Promise<void> {
    this.emitStatus("connecting");

    try {
      // Get audio-only user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

      // Add local audio tracks to the connection
      for (const track of this.localStream.getAudioTracks()) {
        this.peerConnection.addTrack(track, this.localStream);
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: "ice_candidate",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        if (state === "connected") {
          this.emitStatus("active");
        } else if (state === "disconnected" || state === "failed") {
          this.emitStatus("error", "WebRTC connection lost");
        } else if (state === "closed") {
          this.emitStatus("ended");
        }
      };

      // Handle remote audio tracks (debtor voice)
      this.peerConnection.ontrack = (event) => {
        // Create an audio element to play the remote audio
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {
          // Autoplay may be blocked; user interaction required
        });
      };

      // Open signaling WebSocket
      await this.openWebSocket();

      // Create and send SDP offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: "offer",
        sdp: offer.sdp,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect";
      this.emitStatus("error", message);
      this.cleanup();
    }
  }

  /**
   * Disconnect and clean up all resources.
   */
  disconnect(): void {
    this.cleanup();
    this.emitStatus("ended");
  }

  private openWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webSocket = new WebSocket(this.wsUrl);

      this.webSocket.onopen = () => {
        resolve();
      };

      this.webSocket.onmessage = (event) => {
        this.handleSignalingMessage(event.data);
      };

      this.webSocket.onerror = () => {
        reject(new Error("WebSocket connection failed"));
      };

      this.webSocket.onclose = () => {
        // If connection is still supposed to be active, this is unexpected
        if (
          this.peerConnection &&
          this.peerConnection.connectionState !== "closed"
        ) {
          this.emitStatus("error", "Signaling connection lost");
        }
      };
    });
  }

  private async handleSignalingMessage(data: string): Promise<void> {
    try {
      const message: SignalingMessage = JSON.parse(data);

      switch (message.type) {
        case "answer":
          if (message.sdp && this.peerConnection) {
            const answer = new RTCSessionDescription({
              type: "answer",
              sdp: message.sdp,
            });
            await this.peerConnection.setRemoteDescription(answer);
          }
          break;

        case "ice_candidate":
          if (message.candidate && this.peerConnection) {
            const candidate = new RTCIceCandidate(message.candidate);
            await this.peerConnection.addIceCandidate(candidate);
          }
          break;

        case "error":
          this.emitStatus("error", message.error ?? "Signaling error");
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  private emitStatus(status: WebRTCStatus, error?: string): void {
    this.statusListener?.(status, error);
  }

  private cleanup(): void {
    // Stop local media tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Close WebSocket
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
  }
}
