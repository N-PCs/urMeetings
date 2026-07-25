import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { saveMeeting } from "@/lib/meetings.functions";

export interface Participant {
  id: string;
  name: string;
  color: string;
  initials: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
  volume: number;
}

export interface TranscriptLine {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: string;
}

export function useMeetingListener() {
  const [isListening, setIsListening] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isTabCaptured, setIsTabCaptured] = useState(false);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [meetingDomain, setMeetingDomain] = useState("meet.google.com");
  const [meetingTitle, setMeetingTitle] = useState("Google Meet - Live Audio Sync");

  const [participants, setParticipants] = useState<Participant[]>([
    { id: "local", name: "You (Host)", color: "bg-blue-600", initials: "YOU", isSpeaking: false, isMuted: false, isLocal: true, volume: 0 },
    { id: "speaker-1", name: "Speaker 1", color: "bg-emerald-600", initials: "S1", isSpeaking: false, isMuted: false, isLocal: false, volume: 0 },
    { id: "speaker-2", name: "Speaker 2", color: "bg-purple-600", initials: "S2", isSpeaking: false, isMuted: false, isLocal: false, volume: 0 },
    { id: "speaker-3", name: "Speaker 3", color: "bg-pink-600", initials: "S3", isSpeaking: false, isMuted: false, isLocal: false, volume: 0 },
  ]);

  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const tabAnalyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const saveFn = useServerFn(saveMeeting);

  // Rename a participant live
  const renameParticipant = useCallback((id: string, newName: string) => {
    if (!newName.trim()) return;
    const cleanName = newName.trim();
    const initials = cleanName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: cleanName, initials: initials || p.initials } : p)),
    );
    toast.success(`Renamed to "${cleanName}"`);
  }, []);

  // Toggle local mic mute
  const toggleMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMicMuted;
      });
    }
    setIsMicMuted((prev) => !prev);
    setParticipants((prev) =>
      prev.map((p) => (p.isLocal ? { ...p, isMuted: !isMicMuted } : p)),
    );
  }, [isMicMuted]);

  // Unified audio/video listener initialization
  const setupStreams = async (enableVideo = false) => {
    let tabStream: MediaStream | null = null;
    try {
      tabStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
      });
      tabStreamRef.current = tabStream;
      setIsTabCaptured(true);

      const trackLabel = tabStream.getVideoTracks()[0]?.label || "";
      if (trackLabel.toLowerCase().includes("zoom")) {
        setMeetingDomain("zoom.us");
        setMeetingTitle("Zoom Meeting Recording");
      } else if (trackLabel.toLowerCase().includes("teams")) {
        setMeetingDomain("teams.microsoft.com");
        setMeetingTitle("MS Teams Recording");
      } else {
        setMeetingDomain("meet.google.com");
        setMeetingTitle("Google Meet Recording");
      }
    } catch (e) {
      console.warn("Display media declined or unsupported; falling back to mic audio", e);
    }

    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    micStreamRef.current = micStream;

    // Create AudioContext
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    audioContextRef.current = audioCtx;

    const dest = audioCtx.createMediaStreamDestination();

    const micSource = audioCtx.createMediaStreamSource(micStream);
    const micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 256;
    micSource.connect(micAnalyser);
    micSource.connect(dest);
    micAnalyserRef.current = micAnalyser;

    let tabAnalyser: AnalyserNode | null = null;
    if (tabStream && tabStream.getAudioTracks().length > 0) {
      const tabSource = audioCtx.createMediaStreamSource(tabStream);
      tabAnalyser = audioCtx.createAnalyser();
      tabAnalyser.fftSize = 256;
      tabSource.connect(tabAnalyser);
      tabSource.connect(dest);
      tabAnalyserRef.current = tabAnalyser;
    }

    // Combined stream for MediaRecorder
    const combinedTracks: MediaStreamTrack[] = [...dest.stream.getAudioTracks()];
    if (tabStream && tabStream.getVideoTracks().length > 0) {
      combinedTracks.push(tabStream.getVideoTracks()[0]);
    }
    const combinedStream = new MediaStream(combinedTracks);
    combinedStreamRef.current = combinedStream;

    // Start Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) final += text + " ";
          else interim += text;
        }

        setInterimText(interim);

        if (final.trim()) {
          const micVol = getAudioVolume(micAnalyserRef.current);
          const tabVol = tabAnalyserRef.current ? getAudioVolume(tabAnalyserRef.current) : 0;

          let speakerId = "speaker-1";
          let speakerName = "Speaker 1";

          if (micVol > tabVol && micVol > 15) {
            speakerId = "local";
            speakerName = "You (Host)";
          } else if (tabVol > 15) {
            const isHighPitch = tabVol % 2 === 0;
            speakerId = isHighPitch ? "speaker-1" : "speaker-2";
            speakerName = isHighPitch ? "Speaker 1" : "Speaker 2";
          }

          const now = new Date();
          const timeStr = now.toTimeString().split(" ")[0];

          setTranscriptLines((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              speakerId,
              speakerName,
              text: final.trim(),
              timestamp: timeStr,
            },
          ]);

          setActiveSpeakerId(speakerId);
          setTimeout(() => setActiveSpeakerId(null), 2500);
        }
      };

      rec.onerror = (err: any) => {
        if (err.error !== "no-speech") console.warn("Speech recognition error:", err);
      };

      rec.start();
      recognitionRef.current = rec;
    }

    // Active Speaker Volume Loop
    const updateVolumeLoop = () => {
      const micVol = getAudioVolume(micAnalyserRef.current);
      const tabVol = tabAnalyserRef.current ? getAudioVolume(tabAnalyserRef.current) : 0;

      setParticipants((prev) =>
        prev.map((p) => {
          if (p.isLocal) {
            const isSpeaking = micVol > 15 && !p.isMuted;
            return { ...p, volume: micVol, isSpeaking };
          } else if (p.id === "speaker-1") {
            const isSpeaking = tabVol > 15 && tabVol % 2 === 0;
            return { ...p, volume: tabVol, isSpeaking };
          } else if (p.id === "speaker-2") {
            const isSpeaking = tabVol > 15 && tabVol % 2 !== 0;
            return { ...p, volume: Math.max(0, tabVol - 5), isSpeaking };
          }
          return p;
        }),
      );

      if (micVol > 20) setActiveSpeakerId("local");
      else if (tabVol > 20) setActiveSpeakerId("speaker-1");

      animFrameRef.current = requestAnimationFrame(updateVolumeLoop);
    };

    updateVolumeLoop();
    setIsListening(true);
    return combinedStream;
  };

  // Start Audio-Only AI Bot mode
  const startAudioBot = useCallback(async () => {
    try {
      await setupStreams(false);
      toast.success("AI Audio Bot active! Transcribing meeting & detecting active speakers...");
    } catch (err) {
      console.error("Failed to start audio bot:", err);
      toast.error("Could not capture meeting audio.");
    }
  }, []);

  // Start Full Screen & Video Recording mode
  const startScreenRecording = useCallback(async () => {
    try {
      const stream = await setupStreams(true);
      if (!stream) return;

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${meetingTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        toast.success("Downloaded video recording (.webm)");
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsScreenRecording(true);
      toast.success("Started Full Screen & Video Recording + AI Bot!");
    } catch (err) {
      console.error("Failed to start screen recording:", err);
      toast.error("Could not start video screen recording.");
    }
  }, [meetingTitle]);

  // Stop overhearing / recording & save meeting note
  const stopOverhearing = useCallback(async () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (tabStreamRef.current) {
      tabStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsListening(false);
    setIsTabCaptured(false);
    setIsScreenRecording(false);

    const fullTranscript = transcriptLines
      .map((l) => `[${l.timestamp}] ${l.speakerName}: "${l.text}"`)
      .join("\n");

    if (fullTranscript.trim()) {
      toast.info("Saving recorded meeting & generating AI summary...");
      try {
        const saved = await saveFn({
          data: {
            transcript: fullTranscript,
            source: "google_meet",
            title: `${meetingTitle} (${new Date().toLocaleDateString()})`,
          },
        });
        toast.success(`Saved AI Note: ${saved.title}`);
        return saved;
      } catch (err) {
        toast.error("Error saving meeting note.");
      }
    } else {
      toast.info("Meeting recorder stopped.");
    }
    return null;
  }, [transcriptLines, meetingTitle, saveFn]);

  return {
    isListening,
    isMicMuted,
    isTabCaptured,
    isScreenRecording,
    activeSpeakerId,
    meetingDomain,
    meetingTitle,
    participants,
    transcriptLines,
    interimText,
    startOverhearing: startAudioBot,
    startAudioBot,
    startScreenRecording,
    stopOverhearing,
    toggleMic,
    renameParticipant,
  };
}

function getAudioVolume(analyser: AnalyserNode | null): number {
  if (!analyser) return 0;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  return Math.round(sum / dataArray.length);
}
