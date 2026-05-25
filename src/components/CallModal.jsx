import React, { useState, useEffect, useRef, useCallback } from "react";
import { callService } from "../services";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function CallModal({
  side,
  callId: initialCallId,
  targetId,
  targetName,
  callType,
  offer,
  onEnd,
}) {
  const [phase, setPhase] = useState(
    side === "caller" ? "connecting" : "incoming",
  );
  // Keep callId in BOTH state (for rendering) and ref (for closures in intervals)
  const [callId, setCallIdState] = useState(initialCallId || null);
  const callIdRef = useRef(initialCallId || null);
  const setCallId = (id) => {
    callIdRef.current = id;
    setCallIdState(id);
  };

  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pollRef = useRef(null);
  const durationRef = useRef(null);
  const knownIceLenRef = useRef(0);
  // Track if we've already ended to avoid double-call
  const endedRef = useRef(false);

  const stopAll = useCallback(() => {
    clearInterval(pollRef.current);
    clearInterval(durationRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
  }, []);

  const hangUp = useCallback(
    async (reason = "ended") => {
      if (endedRef.current) return;
      endedRef.current = true;
      stopAll();
      const id = callIdRef.current;
      if (id) {
        await callService.end(id, reason === "declined").catch(() => {});
      }
      onEnd && onEnd();
    },
    [stopAll, onEnd],
  );

  const getMedia = async () => {
    const constraints =
      callType === "audio"
        ? { audio: true, video: false }
        : { audio: true, video: { facingMode: "user" } };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      // Try audio-only fallback if video fails
      if (callType === "video") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          localStreamRef.current = stream;
          return stream;
        } catch {}
      }
      throw err;
    }
  };

  const createPC = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        remoteVideoRef.current.play().catch(() => {});
      }
    };
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "disconnected" || s === "failed" || s === "closed") {
        hangUp("ended");
      }
    };
    return pc;
  };

  // ── Caller flow ──────────────────────────────────────────────────────────────
  const startCallerFlow = async () => {
    try {
      const stream = await getMedia();

      const { id } = await callService.initiate(targetId, callType);
      setCallId(id); // updates both state and ref immediately

      const pc = createPC(stream);

      pc.onicecandidate = ({ candidate }) => {
        if (candidate)
          callService.sendIce(id, candidate, "caller").catch(() => {});
      };

      const offerDesc = await pc.createOffer();
      await pc.setLocalDescription(offerDesc);
      await callService.sendOffer(id, pc.localDescription.toJSON());
      setPhase("ringing");

      knownIceLenRef.current = 0;
      pollRef.current = setInterval(async () => {
        if (endedRef.current) return;
        try {
          const state = await callService.getState(id);
          if (state.status === "declined" || state.status === "ended") {
            hangUp("ended");
            return;
          }
          if (
            state.answer &&
            pc.signalingState !== "stable" &&
            pc.signalingState !== "closed"
          ) {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(state.answer),
              );
              setPhase("active");
              durationRef.current = setInterval(
                () => setDuration((d) => d + 1),
                1000,
              );
            } catch {}
          }
          const callee_ice = state.callee_ice || [];
          for (let i = knownIceLenRef.current; i < callee_ice.length; i++) {
            await pc
              .addIceCandidate(new RTCIceCandidate(callee_ice[i]))
              .catch(() => {});
          }
          knownIceLenRef.current = callee_ice.length;
        } catch {}
      }, 2000);
    } catch (err) {
      const msg = err?.message || "";
      if (
        msg.includes("Permission") ||
        msg.includes("NotAllowed") ||
        msg.includes("NotFound")
      ) {
        setError(
          "Нет доступа к камере/микрофону. Разрешите доступ в браузере.",
        );
      } else {
        setError("Ошибка: " + (msg || "Не удалось начать звонок"));
      }
      setPhase("error");
    }
  };

  // ── Callee flow ──────────────────────────────────────────────────────────────
  const acceptCall = async () => {
    const id = callIdRef.current;
    try {
      setPhase("connecting");
      const stream = await getMedia();
      const pc = createPC(stream);

      pc.onicecandidate = ({ candidate }) => {
        if (candidate)
          callService.sendIce(id, candidate, "callee").catch(() => {});
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answerDesc = await pc.createAnswer();
      await pc.setLocalDescription(answerDesc);
      await callService.sendAnswer(id, pc.localDescription.toJSON());
      setPhase("active");
      durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

      knownIceLenRef.current = 0;
      pollRef.current = setInterval(async () => {
        if (endedRef.current) return;
        try {
          const state = await callService.getState(id);
          if (state.status === "ended" || state.status === "declined") {
            hangUp("ended");
            return;
          }
          const caller_ice = state.caller_ice || [];
          for (let i = knownIceLenRef.current; i < caller_ice.length; i++) {
            await pc
              .addIceCandidate(new RTCIceCandidate(caller_ice[i]))
              .catch(() => {});
          }
          knownIceLenRef.current = caller_ice.length;
        } catch {}
      }, 2000);
    } catch (err) {
      const msg = err?.message || "";
      if (
        msg.includes("Permission") ||
        msg.includes("NotAllowed") ||
        msg.includes("NotFound")
      ) {
        setError(
          "Нет доступа к камере/микрофону. Разрешите доступ в браузере.",
        );
      } else {
        setError("Ошибка: " + (msg || "Не удалось принять звонок"));
      }
      setPhase("error");
    }
  };

  useEffect(() => {
    if (side === "caller") startCallerFlow();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = muted;
    });
    setMuted((m) => !m);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = camOff;
    });
    setCamOff((c) => !c);
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
      {callType === "video" && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm p-6">
        <div className="text-white text-center mb-4">
          <div className="text-5xl mb-3">
            {callType === "video" ? "📹" : "📞"}
          </div>
          <h2 className="text-xl font-bold">{targetName}</h2>
          <p className="text-white/70 text-sm mt-1">
            {phase === "connecting" && "Подключаемся..."}
            {phase === "ringing" && "Вызываем... ☎️"}
            {phase === "incoming" &&
              `Входящий ${callType === "video" ? "видео" : "аудио"} звонок`}
            {phase === "active" && fmt(duration)}
            {phase === "error" && <span className="text-red-300">{error}</span>}
          </p>
        </div>

        {callType === "video" && (
          <div className="relative w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl mb-4 self-end">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {camOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white text-2xl">
                📵
              </div>
            )}
          </div>
        )}

        {phase === "incoming" && (
          <div className="flex gap-6 mt-4">
            <button
              onClick={() => hangUp("declined")}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl shadow-xl active:scale-95 transition"
            >
              📵
            </button>
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl shadow-xl active:scale-95 transition"
            >
              {callType === "video" ? "📹" : "📞"}
            </button>
          </div>
        )}

        {(phase === "active" ||
          phase === "ringing" ||
          phase === "connecting") && (
          <div className="flex gap-4 mt-4">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition active:scale-95 ${
                muted
                  ? "bg-red-500 text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {muted ? "🔇" : "🎙"}
            </button>
            {callType === "video" && (
              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition active:scale-95 ${
                  camOff
                    ? "bg-red-500 text-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {camOff ? "📵" : "📷"}
              </button>
            )}
            <button
              onClick={() => hangUp("ended")}
              className="w-14 h-14 rounded-full bg-red-500 text-white text-xl flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              ☎️
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <p className="text-red-300 text-sm text-center px-4">{error}</p>
            <button
              onClick={() => onEnd && onEnd()}
              className="px-6 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
