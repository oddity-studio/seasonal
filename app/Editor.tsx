"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Player, type PlayerRef, Thumbnail } from "@remotion/player";
import { HelloWorld, LAYOUT_OPTIONS, FONT_OPTIONS, getLayoutControls, isBattleLayout, isWeeklyTitleLayout, isKillstreakOverlayLayout, isKingOverlayLayout, isSlideLinesOverlayLayout, isSlideLinesDuelLayout, isSlideLinesTourneyLayout, isPrizesGridLayout, PRIZE_LOGOS, getLayoutDefaultDuration, resolveLayoutIndex, getLayoutLabel } from "@/src/HelloWorld";
import { defaultVideoProps, videoPropsSchema, FPS, DEFAULT_SCENE_DURATION, getSceneFrames, getTotalFrames } from "@/src/types";
import type { VideoProps, Scene, ColorScheme } from "@/src/types";
import { AUTOMATE_PARSERS } from "./automateParsers";

type RssEntry = { username: string; number: string };

const RSS_FEEDS: Record<string, string> = {
  "weekly-top-battles": "https://www.audeobox.com/api/feeds/weekly-top-battles.xml",
  "weekly-top-wins": "https://www.audeobox.com/api/feeds/weekly-top-wins.xml",
  "weekly-top-plays": "https://www.audeobox.com/api/feeds/weekly-top-plays.xml",
};

type RssBinding = {
  feedKey: string;
  slotIndex: number;
};

const LAYOUT_RSS_BINDINGS: Record<string, RssBinding[]> = {
  "Weekly Stats 1": [
    { feedKey: "weekly-top-battles", slotIndex: 0 },
    { feedKey: "weekly-top-wins", slotIndex: 1 },
    { feedKey: "weekly-top-plays", slotIndex: 2 },
  ],
};

async function fetchRssFeed(feedKey: string): Promise<RssEntry | null> {
  const feedUrl = RSS_FEEDS[feedKey];
  if (!feedUrl) return null;
  try {
    const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`);
    if (!res.ok) return null;
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const title = doc.querySelector("item > title")?.textContent ?? "";
    const m = title.match(/#\d+\s*[—–-]\s*(.+?)\s*\((\d+)/);
    if (!m) return null;
    return { username: m[1].trim(), number: m[2] };
  } catch {
    return null;
  }
}

function applyRssToScene(scene: Scene, bindings: RssBinding[], cache: Record<string, RssEntry>): Scene {
  const [users = "", nums = ""] = scene.text.split("\n");
  const uArr = users.split("|");
  const nArr = nums.split("|");
  for (const { feedKey, slotIndex } of bindings) {
    const entry = cache[feedKey];
    if (!entry) continue;
    uArr[slotIndex] = entry.username;
    nArr[slotIndex] = entry.number;
  }
  return { ...scene, text: `${uArr.join("|")}\n${nArr.join("|")}` };
}

const SCENE_DURATION = DEFAULT_SCENE_DURATION * FPS;

const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <polygon points="5,3 17,10 5,17" />
  </svg>
);
const IconPause = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="4" y="3" width="4" height="14" rx="1" />
    <rect x="12" y="3" width="4" height="14" rx="1" />
  </svg>
);
const IconPrev = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="3" y="3" width="2" height="14" rx="1" />
    <polygon points="17,3 7,10 17,17" />
  </svg>
);
const IconNext = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <polygon points="3,3 13,10 3,17" />
    <rect x="15" y="3" width="2" height="14" rx="1" />
  </svg>
);
const IconFullscreen = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7V3h4" />
    <path d="M13 3h4v4" />
    <path d="M17 13v4h-4" />
    <path d="M7 17H3v-4" />
  </svg>
);
const IconMuted = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="3,7 7,7 12,3 12,17 7,13 3,13" fill="currentColor" stroke="none" />
    <line x1="14" y1="7" x2="18" y2="13" />
    <line x1="18" y1="7" x2="14" y2="13" />
  </svg>
);
const IconUnmuted = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="3,7 7,7 12,3 12,17 7,13 3,13" fill="currentColor" stroke="none" />
    <path d="M14.5 7c1.5 1.5 1.5 4.5 0 6" />
    <path d="M16.8 5c2.4 2.4 2.4 7.6 0 10" />
  </svg>
);

export default function Editor() {
  const [props, setProps] = useState<VideoProps>(defaultVideoProps);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [recordingMode, setRecordingMode] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const playerRef = useRef<PlayerRef>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const [presetNames, setPresetNames] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [automateText, setAutomateText] = useState("");
  const [thumbMissing, setThumbMissing] = useState<Record<number, boolean>>({});
  const [showDevTools, setShowDevTools] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" && !["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        setShowDevTools((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Subscribe to Remotion Player events so our custom controls reflect state.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onMuteChange = (e: { detail: { isMuted: boolean } }) => setIsMuted(e.detail.isMuted);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnded);
    player.addEventListener("mutechange", onMuteChange);
    setIsMuted(player.isMuted());
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("mutechange", onMuteChange);
    };
  }, []);

  // Poll current frame every animation frame so the progress bar stays in sync.
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      const p = playerRef.current;
      if (p) {
        const f = p.getCurrentFrame();
        if (f !== last) {
          last = f;
          setCurrentFrame(f);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleBakeFrame = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert("Screen capture not supported.");
      return;
    }
    let displayStream: MediaStream | null = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        // @ts-expect-error preferCurrentTab is a newer Chrome API
        preferCurrentTab: true,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      throw err;
    }
    setRecordingMode(true);
    await new Promise((r) => setTimeout(r, 600));
    try {
      const playerWrap = document.querySelector(".player-wrap") as HTMLElement;
      if (!playerWrap) throw new Error("Player not found");

      // Try CropTarget for an exact crop
      let cropSuccess = false;
      // @ts-expect-error CropTarget newer Chrome API
      if (typeof CropTarget !== "undefined") {
        try {
          // @ts-expect-error
          const ct = await CropTarget.fromElement(playerWrap);
          // @ts-expect-error
          await displayStream.getVideoTracks()[0].cropTo(ct);
          cropSuccess = true;
        } catch {}
      }
      const rect = playerWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = Math.round(rect.left * dpr);
      const sy = Math.round(rect.top * dpr);
      const sw = Math.round(rect.width * dpr);
      const sh = Math.round(rect.height * dpr);

      // Read one frame from the track
      const track = displayStream.getVideoTracks()[0];
      const processor = new MediaStreamTrackProcessor({ track });
      const reader = processor.readable.getReader();
      // Skip a couple of frames to let cropTo settle
      for (let i = 0; i < 3; i++) {
        const { value, done } = await reader.read();
        if (done) break;
        if (i < 2) value?.close();
        else if (value) {
          const out = new OffscreenCanvas(1080, 1920);
          const ctx = out.getContext("2d")!;
          if (cropSuccess) ctx.drawImage(value, 0, 0, 1080, 1920);
          else ctx.drawImage(value, sx, sy, sw, sh, 0, 0, 1080, 1920);
          value.close();
          const blob = await out.convertToBlob({ type: "image/png" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          // Name by current first scene's layout index if any
          const layoutIdx = resolveLayoutIndex(props.scenes[0]?.layout, 0);
          a.href = url;
          a.download = `${layoutIdx}.png`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
      reader.cancel();
    } finally {
      displayStream?.getTracks().forEach((t) => t.stop());
      setRecordingMode(false);
    }
  }, [props.scenes]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const loadPreset = useCallback(async (name: string) => {
    const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
    try {
      const res = await fetch(`${BASE}/picker/presets/${encodeURIComponent(name)}.json`);
      const data = await res.json();
      const parsed = videoPropsSchema.safeParse(data);
      if (!parsed.success) return;
      setProps({ ...parsed.data, overlayVideo: parsed.data.overlayVideo ?? "none" });
      setSelectedPreset(name);
    } catch {}
  }, []);

  // Fetch preset list, then auto-load Demo
  useEffect(() => {
    const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${BASE}/picker/presets/index.json`)
      .then((r) => r.json())
      .then((names: string[]) => setPresetNames(names))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (presetNames.length > 0 && !selectedPreset) {
      if (presetNames.includes("Demo")) loadPreset("Demo");
    }
  }, [presetNames, loadPreset, selectedPreset]);

  // Group layouts by category
  const categories = LAYOUT_OPTIONS.reduce<Record<string, typeof LAYOUT_OPTIONS>>((acc, opt) => {
    (acc[opt.category] ??= []).push(opt);
    return acc;
  }, {});

  const handleSave = useCallback(() => {
    // Strip blob: URLs from backgroundVideo since they're session-only, but keep muted state.
    // Also normalize layout → string label so presets survive template reordering.
    const cleaned = {
      ...props,
      scenes: props.scenes.map((s) => {
        let scene = s;
        if (typeof s.layout === "number") {
          const label = getLayoutLabel(s.layout);
          if (label) scene = { ...scene, layout: label };
        }
        if (scene.backgroundVideo?.src?.startsWith("blob:")) {
          const { backgroundVideo, ...rest } = scene;
          const muted = backgroundVideo?.muted;
          return muted !== undefined ? { ...rest, backgroundVideo: { src: "", muted } } : rest;
        }
        return scene;
      }),
    };
    const json = JSON.stringify(cleaned, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seasonal-preset.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [props]);

  const handleLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = videoPropsSchema.safeParse(JSON.parse(reader.result as string));
        if (parsed.success) {
          setProps({ ...parsed.data, overlayVideo: parsed.data.overlayVideo ?? "none" });
        } else {
          alert("Invalid preset file.");
        }
      } catch {
        alert("Could not read preset file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const renderClipBlob = useCallback(async (
    clipProps: VideoProps,
    displayStream: MediaStream,
    hwPref: HardwareAcceleration,
    onProgress: (pct: number) => void,
    audioStartFrame: number = 0,
  ): Promise<Blob> => {
    const playerWrap = document.querySelector(".player-wrap") as HTMLElement;
    if (!playerWrap) throw new Error("Player element not found");

    const totalFramesLocal = getTotalFrames(clipProps);
    const durationMs = (totalFramesLocal / FPS) * 1000;

    // Pre-load and decode audio
    const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const audioCtx = new AudioContext();
    let audioBuf: AudioBuffer;
    if (!clipProps.music || clipProps.music === "none") {
      audioBuf = audioCtx.createBuffer(2, audioCtx.sampleRate, audioCtx.sampleRate);
    } else {
      const audioResp = await fetch(`${BASE}/picker/music/${clipProps.music}`);
      audioBuf = await audioCtx.decodeAudioData(await audioResp.arrayBuffer());
    }
    await audioCtx.close();

    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      firstTimestampBehavior: "offset",
      video: { codec: "avc", width: 720, height: 1280 },
      audio: {
        codec: "aac",
        sampleRate: audioBuf.sampleRate,
        numberOfChannels: audioBuf.numberOfChannels,
      },
      fastStart: "in-memory",
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("VideoEncoder:", e),
    });
    videoEncoder.configure({
      codec: "avc1.640034",
      width: 720,
      height: 1280,
      bitrate: 10_000_000,
      framerate: FPS,
      hardwareAcceleration: hwPref,
    });

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => console.error("AudioEncoder:", e),
    });
    audioEncoder.configure({
      codec: "mp4a.40.2",
      sampleRate: audioBuf.sampleRate,
      numberOfChannels: audioBuf.numberOfChannels,
      bitrate: 128_000,
    });

    let cropSuccess = false;
    // @ts-expect-error CropTarget
    if (typeof CropTarget !== "undefined") {
      try {
        // @ts-expect-error
        const ct = await CropTarget.fromElement(playerWrap);
        // @ts-expect-error
        await displayStream.getVideoTracks()[0].cropTo(ct);
        cropSuccess = true;
      } catch {}
    }

    const rect = playerWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = Math.round(rect.left * dpr);
    const sy = Math.round(rect.top * dpr);
    const sw = Math.round(rect.width * dpr);
    const sh = Math.round(rect.height * dpr);

    const offscreen = new OffscreenCanvas(720, 1280);
    const offCtx = offscreen.getContext("2d")!;

    playerRef.current?.seekTo(0);
    playerRef.current?.play();
    const startTime = performance.now();
    let frameCount = 0;

    const videoTrack = displayStream.getVideoTracks()[0].clone();
    const processor = new MediaStreamTrackProcessor({ track: videoTrack });
    const reader = processor.readable.getReader();

    while (true) {
      const { value: frame, done } = await reader.read();
      if (done || !frame) break;
      const elapsed = performance.now() - startTime;
      if (elapsed >= durationMs) {
        frame.close();
        break;
      }
      if (cropSuccess) offCtx.drawImage(frame, 0, 0, 720, 1280);
      else offCtx.drawImage(frame, sx, sy, sw, sh, 0, 0, 720, 1280);
      const outputFrame = new VideoFrame(offscreen, { timestamp: frame.timestamp });
      videoEncoder.encode(outputFrame, { keyFrame: frameCount % 120 === 0 });
      outputFrame.close();
      frame.close();
      frameCount++;
      onProgress(Math.min(95, Math.round((elapsed / durationMs) * 100)));
    }

    playerRef.current?.pause();
    try { await reader.cancel(); } catch {}
    try { reader.releaseLock(); } catch {}
    try { videoTrack.stop(); } catch {}

    const CHUNK_SIZE = 1024;
    const startSample = Math.floor((audioStartFrame / FPS) * audioBuf.sampleRate);
    const available = Math.max(0, audioBuf.length - startSample);
    const maxSamples = Math.min(available, Math.ceil((audioBuf.sampleRate * durationMs) / 1000));
    for (let i = 0; i < maxSamples; i += CHUNK_SIZE) {
      const len = Math.min(CHUNK_SIZE, maxSamples - i);
      const data = new Float32Array(len * audioBuf.numberOfChannels);
      for (let c = 0; c < audioBuf.numberOfChannels; c++) {
        data.set(audioBuf.getChannelData(c).subarray(startSample + i, startSample + i + len), c * len);
      }
      const ad = new AudioData({
        format: "f32-planar",
        sampleRate: audioBuf.sampleRate,
        numberOfFrames: len,
        numberOfChannels: audioBuf.numberOfChannels,
        timestamp: Math.round((i / audioBuf.sampleRate) * 1_000_000),
        data,
      });
      audioEncoder.encode(ad);
      ad.close();
    }

    await videoEncoder.flush();
    await audioEncoder.flush();
    videoEncoder.close();
    audioEncoder.close();
    muxer.finalize();

    onProgress(100);
    return new Blob([target.buffer], { type: "video/mp4" });
  }, []);

  const handleDownloadPerScene = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || typeof VideoEncoder === "undefined") {
      alert("Screen capture or video encoding not supported.");
      return;
    }
    let displayStream: MediaStream | null = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: FPS } },
        // @ts-expect-error preferCurrentTab
        preferCurrentTab: true,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      throw err;
    }

    const savedProps = props;
    const scenes = props.scenes;
    setRendering(true);
    setRecordingMode(true);
    setRenderProgress(0);
    await new Promise((r) => setTimeout(r, 600));

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    try {
      let cumulativeFrames = 0;
      for (let i = 0; i < scenes.length; i++) {
        const sceneProps: VideoProps = { ...savedProps, scenes: [scenes[i]] };
        setProps(sceneProps);
        await new Promise((r) => setTimeout(r, 800));
        const blob = await renderClipBlob(
          sceneProps,
          displayStream,
          "no-preference",
          (pct) => setRenderProgress(Math.round(((i + pct / 100) / scenes.length) * 100)),
          cumulativeFrames,
        );
        zip.file(`scene-${String(i + 1).padStart(2, "0")}.mp4`, blob);
        cumulativeFrames += getSceneFrames(scenes[i]);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scenes.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Per-scene render failed. See console.");
    } finally {
      displayStream?.getTracks().forEach((t) => t.stop());
      setProps(savedProps);
      setRendering(false);
      setRecordingMode(false);
      setRenderProgress(0);
    }
  }, [props, renderClipBlob]);

  const handleDownload = useCallback(async (hwPref: HardwareAcceleration = "no-preference") => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert(
        'Screen capture not supported. Use Chrome or run "npm run render" for offline export.',
      );
      return;
    }
    if (typeof VideoEncoder === "undefined") {
      alert(
        'Video encoding not supported. Use Chrome 94+ or run "npm run render" for offline export.',
      );
      return;
    }

    // Capture the current tab immediately while user gesture is still active
    let displayStream: MediaStream | null = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: FPS } },
        // @ts-expect-error preferCurrentTab is a newer Chrome API
        preferCurrentTab: true,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        return; // User cancelled — no alert needed
      }
      throw err;
    }

    const totalFrames = getTotalFrames(props);
    const durationMs = (totalFrames / FPS) * 1000;

    setRendering(true);
    setRecordingMode(true);
    setRenderProgress(0);

    // Wait for recording overlay to render
    await new Promise((r) => setTimeout(r, 600));

    try {
      const playerWrap = document.querySelector(
        ".player-wrap",
      ) as HTMLElement;
      if (!playerWrap) throw new Error("Player element not found");

      // Pre-load and decode audio
      const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const audioCtx = new AudioContext();
      let audioBuf: AudioBuffer;
      if (!props.music || props.music === "none") {
        // Silent 1s stereo buffer; will be encoded as silence
        audioBuf = audioCtx.createBuffer(2, audioCtx.sampleRate, audioCtx.sampleRate);
      } else {
        const audioResp = await fetch(`${BASE}/picker/music/${props.music}`);
        audioBuf = await audioCtx.decodeAudioData(await audioResp.arrayBuffer());
      }
      await audioCtx.close();

      // Set up MP4 muxer
      const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        firstTimestampBehavior: "offset",
        video: { codec: "avc", width: 720, height: 1280 },
        audio: {
          codec: "aac",
          sampleRate: audioBuf.sampleRate,
          numberOfChannels: audioBuf.numberOfChannels,
        },
        fastStart: "in-memory",
      });

      // Video encoder (H.264)
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("VideoEncoder:", e),
      });
      videoEncoder.configure({
        codec: "avc1.640034",
        width: 720,
        height: 1280,
        bitrate: 10_000_000,
        framerate: FPS,
        hardwareAcceleration: hwPref,
      });

      // Audio encoder (AAC)
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.error("AudioEncoder:", e),
      });
      audioEncoder.configure({
        codec: "mp4a.40.2",
        sampleRate: audioBuf.sampleRate,
        numberOfChannels: audioBuf.numberOfChannels,
        bitrate: 128_000,
      });

      // Crop to the player element if CropTarget is available (Chrome 104+)
      let cropSuccess = false;
      // @ts-expect-error CropTarget is a newer Chrome API
      if (typeof CropTarget !== "undefined") {
        try {
          // @ts-expect-error CropTarget is a newer Chrome API
          const ct = await CropTarget.fromElement(playerWrap);
          // @ts-expect-error cropTo is a newer Chrome API
          await displayStream.getVideoTracks()[0].cropTo(ct);
          cropSuccess = true;
        } catch {
          /* CropTarget not supported, fall back to manual crop */
        }
      }

      // For manual crop fallback: get player position
      const rect = playerWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = Math.round(rect.left * dpr);
      const sy = Math.round(rect.top * dpr);
      const sw = Math.round(rect.width * dpr);
      const sh = Math.round(rect.height * dpr);

      // Offscreen canvas for frame resizing
      const offscreen = new OffscreenCanvas(720, 1280);
      const offCtx = offscreen.getContext("2d")!;

      // Start playback
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
      const startTime = performance.now();
      let frameCount = 0;

      // Read frames from the captured video track
      const videoTrack = displayStream.getVideoTracks()[0];
      const processor = new MediaStreamTrackProcessor({ track: videoTrack });
      const reader = processor.readable.getReader();

      while (true) {
        const { value: frame, done } = await reader.read();
        if (done || !frame) break;

        const elapsed = performance.now() - startTime;
        if (elapsed >= durationMs) {
          frame.close();
          break;
        }

        // Draw frame to offscreen canvas (crop if needed, always resize to 1080x1920)
        if (cropSuccess) {
          offCtx.drawImage(frame, 0, 0, 720, 1280);
        } else {
          offCtx.drawImage(frame, sx, sy, sw, sh, 0, 0, 720, 1280);
        }

        const outputFrame = new VideoFrame(offscreen, {
          timestamp: frame.timestamp,
        });
        videoEncoder.encode(outputFrame, {
          keyFrame: frameCount % 120 === 0,
        });
        outputFrame.close();
        frame.close();
        frameCount++;

        setRenderProgress(
          Math.min(95, Math.round((elapsed / durationMs) * 100)),
        );
      }

      // Stop capture + playback
      playerRef.current?.pause();
      videoTrack.stop();
      displayStream.getTracks().forEach((t) => t.stop());
      displayStream = null;

      // Encode audio from the decoded WAV buffer
      const CHUNK_SIZE = 1024;
      const maxSamples = Math.min(
        audioBuf.length,
        Math.ceil((audioBuf.sampleRate * durationMs) / 1000),
      );
      for (let i = 0; i < maxSamples; i += CHUNK_SIZE) {
        const len = Math.min(CHUNK_SIZE, maxSamples - i);
        const data = new Float32Array(len * audioBuf.numberOfChannels);
        for (let c = 0; c < audioBuf.numberOfChannels; c++) {
          data.set(
            audioBuf.getChannelData(c).subarray(i, i + len),
            c * len,
          );
        }
        const ad = new AudioData({
          format: "f32-planar",
          sampleRate: audioBuf.sampleRate,
          numberOfFrames: len,
          numberOfChannels: audioBuf.numberOfChannels,
          timestamp: Math.round((i / audioBuf.sampleRate) * 1_000_000),
          data,
        });
        audioEncoder.encode(ad);
        ad.close();
      }

      // Finalize MP4
      await videoEncoder.flush();
      await audioEncoder.flush();
      videoEncoder.close();
      audioEncoder.close();
      muxer.finalize();

      setRenderProgress(100);

      // Download
      const blob = new Blob([target.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seasonal.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error(err);
      alert("Recording failed. Check the console for details.");
    } finally {
      displayStream?.getTracks().forEach((t) => t.stop());
      setRendering(false);
      setRecordingMode(false);
      setRenderProgress(0);
    }
  }, [props]);

  const updateScene = (
    index: number,
    field: keyof Scene,
    value: string | number | Scene["backgroundVideo"],
  ) => {
    setProps((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const updateColor = (key: keyof ColorScheme, value: string) => {
    setProps((prev) => ({
      ...prev,
      colorScheme: { ...prev.colorScheme, [key]: value },
    }));
  };

  const removeScene = (index: number) => {
    setProps((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((_, i) => i !== index),
    }));
  };

  const reorderScene = (from: number, to: number) => {
    if (from === to) return;
    setProps((prev) => {
      const scenes = [...prev.scenes];
      const [moved] = scenes.splice(from, 1);
      scenes.splice(to, 0, moved);
      return { ...prev, scenes };
    });
  };

  const totalFrames = getTotalFrames(props);

  // Cumulative start frame of each scene, for custom prev/next scene controls.
  const sceneStarts = useMemo(() => {
    const starts: number[] = [];
    let acc = 0;
    for (const scene of props.scenes) {
      starts.push(acc);
      acc += getSceneFrames(scene);
    }
    return starts;
  }, [props.scenes]);

  const handleTogglePlay = useCallback(() => {
    playerRef.current?.toggle();
  }, []);
  const handlePrevScene = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const f = p.getCurrentFrame();
    const BUFFER = FPS; // if more than 1s into current scene, restart it; else jump to previous
    for (let i = sceneStarts.length - 1; i >= 0; i--) {
      if (sceneStarts[i] <= f - BUFFER) {
        p.seekTo(sceneStarts[i]);
        return;
      }
    }
    p.seekTo(0);
  }, [sceneStarts]);
  const handleNextScene = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const f = p.getCurrentFrame();
    for (const s of sceneStarts) {
      if (s > f) {
        p.seekTo(s);
        return;
      }
    }
    p.seekTo(Math.max(0, totalFrames - 1));
  }, [sceneStarts, totalFrames]);
  const handleToggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) p.unmute();
    else p.mute();
  }, []);
  const handleFullscreen = useCallback(() => {
    playerRef.current?.requestFullscreen();
  }, []);

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.navbarTitle}>VIDEOBOX 2.0</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={loadInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleLoad}
          />
          <button style={styles.galleryButton} onClick={handleSave}>
            Save
          </button>
          <button style={styles.galleryButton} onClick={() => loadInputRef.current?.click()}>
            Load
          </button>
          {showDevTools && (
            <button style={styles.galleryButton} onClick={handleBakeFrame}>
              Bake Frame
            </button>
          )}
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.main}>
        <div
          style={recordingMode ? styles.recordingOverlay : { ...styles.preview, order: 3 }}
          data-player
        >
          <div
            className="player-wrap"
            style={recordingMode ? styles.recordingPlayerWrap : undefined}
          >
            <Player
              ref={playerRef}
              component={HelloWorld}
              schema={videoPropsSchema}
              inputProps={props}
              durationInFrames={Math.max(1, totalFrames)}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              style={
                recordingMode
                  ? { width: "100%", height: "100%" }
                  : { width: "100%", aspectRatio: "9/16" }
              }
              controls={false}
              clickToPlay={!recordingMode}
              loop={!recordingMode}
              renderLoading={() => (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "9/16",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#000",
                  }}
                >
                  <p style={{ color: "#666", fontSize: 14 }}>
                    Loading assets...
                  </p>
                </div>
              )}
            />
          </div>
          {!recordingMode && (
            <>
            <div
              style={styles.progressBarTrack}
              onPointerDown={(e) => {
                const track = e.currentTarget;
                track.setPointerCapture(e.pointerId);
                const seekFromEvent = (ev: React.PointerEvent | PointerEvent) => {
                  const rect = track.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                  const frame = Math.floor(pct * Math.max(1, totalFrames - 1));
                  playerRef.current?.seekTo(frame);
                };
                seekFromEvent(e);
                const onMove = (ev: PointerEvent) => seekFromEvent(ev);
                const onUp = (ev: PointerEvent) => {
                  track.releasePointerCapture(ev.pointerId);
                  track.removeEventListener("pointermove", onMove);
                  track.removeEventListener("pointerup", onUp);
                  track.removeEventListener("pointercancel", onUp);
                };
                track.addEventListener("pointermove", onMove);
                track.addEventListener("pointerup", onUp);
                track.addEventListener("pointercancel", onUp);
              }}
            >
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${Math.max(0, Math.min(100, (currentFrame / Math.max(1, totalFrames - 1)) * 100))}%`,
                }}
              />
            </div>
            <div style={styles.playerControls}>
              <button
                type="button"
                style={styles.playerIconButton}
                title="Fullscreen"
                onClick={handleFullscreen}
              >
                <IconFullscreen />
              </button>
              <div style={styles.playerCenterControls}>
                <button
                  type="button"
                  style={styles.playerIconButton}
                  title="Previous scene"
                  onClick={handlePrevScene}
                >
                  <IconPrev />
                </button>
                <button
                  type="button"
                  style={styles.playerPlayButton}
                  title={isPlaying ? "Pause" : "Play"}
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? <IconPause /> : <IconPlay />}
                </button>
                <button
                  type="button"
                  style={styles.playerIconButton}
                  title="Next scene"
                  onClick={handleNextScene}
                >
                  <IconNext />
                </button>
              </div>
              <button
                type="button"
                style={styles.playerIconButton}
                title={isMuted ? "Unmute" : "Mute"}
                onClick={handleToggleMute}
              >
                {isMuted ? <IconMuted /> : <IconUnmuted />}
              </button>
            </div>
            <button
              style={{
                ...styles.downloadButton,
                opacity: rendering ? 0.6 : 1,
                cursor: rendering ? "not-allowed" : "pointer",
              }}
              onClick={() => handleDownload("no-preference")}
              disabled={rendering}
            >
              {rendering
                ? `Recording\u2026 ${renderProgress}%`
                : "Download Integral"}
            </button>
            <button
              style={{
                ...styles.downloadButton,
                opacity: rendering ? 0.6 : 1,
                cursor: rendering ? "not-allowed" : "pointer",
              }}
              onClick={handleDownloadPerScene}
              disabled={rendering}
            >
              Download Scenes
            </button>
            {showDevTools && (
              <>
                <button
                  style={{
                    ...styles.downloadButton,
                    opacity: rendering ? 0.6 : 1,
                    cursor: rendering ? "not-allowed" : "pointer",
                  }}
                  onClick={() => handleDownload("prefer-software")}
                  disabled={rendering}
                >
                  Render Software
                </button>
                <button
                  style={{
                    ...styles.downloadButton,
                    opacity: rendering ? 0.6 : 1,
                    cursor: rendering ? "not-allowed" : "pointer",
                  }}
                  onClick={() => handleDownload("prefer-hardware")}
                  disabled={rendering}
                >
                  Render Hardware
                </button>
              </>
            )}
            </>
          )}
        </div>

        {!recordingMode && (
          <div style={styles.controls}>
            <div>
              <span style={styles.label}>Preset</span>
              <select
                style={{ ...styles.layoutSelect, width: "100%" }}
                value={selectedPreset || ""}
                onChange={(e) => {
                  if (e.target.value) loadPreset(e.target.value);
                }}
              >
                <option value="" disabled>Presets</option>
                {presetNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                style={{ ...styles.galleryButton, width: "100%", marginTop: 12, opacity: fetching ? 0.5 : 1 }}
                disabled={fetching}
                onClick={async () => {
                  setFetching(true);
                  try {
                    const needed = new Set<string>();
                    for (const scene of props.scenes) {
                      const layout = typeof scene.layout === "string" ? scene.layout : "";
                      const bindings = LAYOUT_RSS_BINDINGS[layout];
                      if (bindings) bindings.forEach((b) => needed.add(b.feedKey));
                    }
                    const cache: Record<string, RssEntry> = {};
                    await Promise.all(
                      [...needed].map(async (key) => {
                        const entry = await fetchRssFeed(key);
                        if (entry) cache[key] = entry;
                      })
                    );
                    if (Object.keys(cache).length > 0) {
                      setProps((prev) => ({
                        ...prev,
                        scenes: prev.scenes.map((scene) => {
                          const layout = typeof scene.layout === "string" ? scene.layout : "";
                          const bindings = LAYOUT_RSS_BINDINGS[layout];
                          if (!bindings) return scene;
                          return applyRssToScene(scene, bindings, cache);
                        }),
                      }));
                    }
                  } finally {
                    setFetching(false);
                  }
                }}
              >
                {fetching ? "Fetching…" : "Fetch Data"}
              </button>
            </div>

            <div>
              <span style={styles.label}>Color Scheme</span>
              <div style={styles.colorRow}>
                {(["dark", "light", "highlight"] as const).map((key) => (
                  <label key={key} style={styles.colorLabel}>
                    <input
                      type="color"
                      value={props.colorScheme[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      style={styles.colorInput}
                    />
                    <span style={styles.colorName}>{key}</span>
                    <span style={styles.colorHex}>
                      {props.colorScheme[key]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.styleRow}>
              <label style={styles.styleLabel}>
                Music
                <select
                  style={{ ...styles.layoutSelect, width: "100%" }}
                  value={props.music || "Tournament.mp3"}
                  onChange={(e) =>
                    setProps((prev) => ({ ...prev, music: e.target.value }))
                  }
                >
                  <option value="none">None</option>
                  <option value="Tournament.mp3">Tournament</option>
                  <option value="Main Lobby.mp3">Main Lobby</option>
                  <option value="Sydosys.mp3">Sydosys</option>
                </select>
              </label>
              <label style={styles.styleLabel}>
                Transition
                <select
                  style={{ ...styles.layoutSelect, width: "100%" }}
                  value={props.transition || "flash.json"}
                  onChange={(e) =>
                    setProps((prev) => ({ ...prev, transition: e.target.value }))
                  }
                >
                  <option value="none">None</option>
                  <option value="flash.json">Flash</option>
                  <option value="Arrow.webm">Arrow</option>
                  <option value="Box1.webm">Box1</option>
                  <option value="Box2.webm">Box2</option>
                </select>
              </label>
              <label style={styles.styleLabel}>
                Font
                <select
                  style={{ ...styles.layoutSelect, width: "100%" }}
                  value={props.font || "Dela Gothic One"}
                  onChange={(e) =>
                    setProps((prev) => ({ ...prev, font: e.target.value }))
                  }
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.styleLabel}>
                Overlay
                <select
                  style={{ ...styles.layoutSelect, width: "100%" }}
                  value={props.overlayVideo || "none"}
                  onChange={(e) =>
                    setProps((prev) => ({ ...prev, overlayVideo: e.target.value }))
                  }
                >
                  <option value="none">None</option>
                  <option value="Grunge.mp4">Grunge</option>
                  <option value="rough.mp4">Paint</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {!recordingMode && (
          <div style={styles.middleColumn}>
            {selectedPreset && AUTOMATE_PARSERS[selectedPreset] && (
              <div style={styles.controls}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={styles.scenesHeader}>
                    <span style={{ ...styles.label, flexDirection: "row" }}>{AUTOMATE_PARSERS[selectedPreset].label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <textarea
                      value={automateText}
                      onChange={(e) => setAutomateText(e.target.value)}
                      placeholder="Paste weekly report text here…"
                      rows={1}
                      style={{
                        ...styles.input,
                        flex: 1,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 12,
                        lineHeight: 1.4,
                        resize: "vertical",
                      }}
                    />
                    <button
                      style={{ ...styles.addButton, alignSelf: "stretch", padding: "0 16px" }}
                      onClick={() => {
                        const entry = AUTOMATE_PARSERS[selectedPreset];
                        if (!entry) return;
                        const next = entry.parser(automateText, props.scenes);
                        setProps((prev) => ({ ...prev, scenes: next }));
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.controls}>
            <div style={styles.scenesHeader}>
              <span style={styles.label}>Scenes</span>
            </div>

            <div style={styles.scenesList}>
              {/* Column headers */}
              <div style={styles.sceneRow}>
                <span style={styles.sceneNumber}></span>
                <span style={{ ...styles.columnHeader, marginRight: 12 }}>Design</span>
                <span style={{ flex: 1 }}></span>
                <span style={{ ...styles.columnHeader, width: 56, textAlign: "center" as const, marginLeft: 12 }}>Size</span>
                <span style={{ ...styles.columnHeader, width: 44, textAlign: "center" as const }}>Time</span>
                <span style={{ width: 18 }}></span>
                <span style={{ width: 22 }}></span>
              </div>

              {/* Scene rows */}
              {props.scenes.map((scene, i) => (
                <div
                  key={i}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                  onDragLeave={() => { if (dragOverIndex === i) setDragOverIndex(null); }}
                  onDrop={() => {
                    if (dragIndex !== null) reorderScene(dragIndex, i);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                  style={{
                    ...styles.sceneRow,
                    opacity: dragIndex === i ? 0.4 : 1,
                    borderTop: dragOverIndex === i && dragIndex !== null && dragIndex !== i ? "2px solid #94a3b8" : "2px solid transparent",
                  }}
                >
                  <span
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    style={{ ...styles.sceneNumber, cursor: "grab", display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <span style={{ color: "#475569", fontSize: 10, lineHeight: 1 }}>&#x2630;</span>
                    {i + 1}
                  </span>
                  <select
                    style={{ ...styles.layoutSelect, marginRight: 12 }}
                    value={resolveLayoutIndex(scene.layout, i)}
                    onChange={(e) => {
                      const layoutIdx = Number(e.target.value);
                      const label = getLayoutLabel(layoutIdx);
                      updateScene(i, "layout", label ?? layoutIdx);
                      const dur = getLayoutDefaultDuration(layoutIdx);
                      if (dur != null) updateScene(i, "duration", dur);
                      if (isKillstreakOverlayLayout(layoutIdx) && !scene.text) {
                        updateScene(i, "text", "99|Player One");
                      }
                      if (isKingOverlayLayout(layoutIdx) && !scene.text) {
                        updateScene(i, "text", "3|Player One");
                      }
                      if (isSlideLinesOverlayLayout(layoutIdx) && !scene.text) {
                        updateScene(
                          i,
                          "text",
                          isSlideLinesDuelLayout(layoutIdx)
                            ? "Player1\nPlayer2"
                            : isSlideLinesTourneyLayout(layoutIdx)
                              ? "Player1 Player2 Player3\n126 89 257"
                              : "Player1|Player2|Player3\n126|89|257",
                        );
                      }
                      if (isWeeklyTitleLayout(layoutIdx) && !scene.text) {
                        const now = new Date();
                        const sun = new Date(now);
                        sun.setDate(now.getDate() - now.getDay());
                        const nextSun = new Date(sun);
                        nextSun.setDate(sun.getDate() + 7);
                        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        const ord = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
                        updateScene(i, "text", `${months[sun.getMonth()]} ${ord(sun.getDate())} \u2013 ${months[nextSun.getMonth()]} ${ord(nextSun.getDate())}`);
                      }
                    }}
                    title="Scene template"
                  >
                    {LAYOUT_OPTIONS.map((opt) => (
                      <option key={opt.index} value={opt.index}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {getLayoutControls(resolveLayoutIndex(scene.layout, i)).map((ctrl, ci) => {
                    if (ctrl.type === "videoUpload") {
                      return (
                        <label key={ci} style={styles.attachVideoButton} title={ctrl.label ?? "Upload video"}>
                          <input
                            type="file"
                            accept="video/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const url = URL.createObjectURL(file);
                              updateScene(i, "backgroundVideo", {
                                src: url,
                                scale: 1.5,
                                blendMode: "normal",
                                startFrom: 0,
                              });
                            }}
                          />
                          {scene.backgroundVideo ? "change video" : "+attach video"}
                        </label>
                      );
                    }
                    return null;
                  })}
                  {isSlideLinesOverlayLayout(resolveLayoutIndex(scene.layout, i)) ? (
                    isSlideLinesTourneyLayout(resolveLayoutIndex(scene.layout, i)) ? (
                      (() => {
                        const [rawA = "", rawB = ""] = (scene.text || "").split("\n");
                        return (
                          <span style={{ display: "flex", flex: 1, gap: 4, minWidth: 0 }}>
                            <input
                              style={{ ...styles.sceneInput, flex: 1, minWidth: 0 }}
                              value={rawA}
                              onChange={(e) => updateScene(i, "text", `${e.target.value}\n${rawB}`)}
                              placeholder="Layer 1 (space = new line)"
                            />
                            <input
                              style={{ ...styles.sceneInput, flex: 1, minWidth: 0 }}
                              value={rawB}
                              onChange={(e) => updateScene(i, "text", `${rawA}\n${e.target.value}`)}
                              placeholder="Layer 2 (space = new line)"
                            />
                          </span>
                        );
                      })()
                    ) : (
                    (() => {
                      const isDuel = isSlideLinesDuelLayout(resolveLayoutIndex(scene.layout, i));
                      const rowCount = isDuel ? 1 : 3;
                      const [rawA = "", rawB = ""] = (scene.text || "").split("\n");
                      const layer1 = rawA.split("|");
                      const layer2 = rawB.split("|");
                      while (layer1.length < rowCount) layer1.push("");
                      while (layer2.length < rowCount) layer2.push("");
                      const save = (l1: string[], l2: string[]) => {
                        updateScene(i, "text", `${l1.slice(0, rowCount).join("|")}\n${l2.slice(0, rowCount).join("|")}`);
                      };
                      return (
                        <span style={{ display: "flex", flex: 1, gap: 4, minWidth: 0 }}>
                          {Array.from({ length: rowCount }, (_, li) => (
                            <span key={li} style={{ display: "flex", flex: 1, gap: 2, minWidth: 0 }}>
                              <input
                                style={{ ...styles.sceneInput, minWidth: 0 }}
                                value={layer1[li] || ""}
                                onChange={(e) => {
                                  const next = [...layer1];
                                  next[li] = e.target.value;
                                  save(next, layer2);
                                }}
                                placeholder={`Line ${li + 1}`}
                              />
                              <input
                                style={isDuel ? { ...styles.sceneInput, flex: 1, minWidth: 0 } : { ...styles.sceneInput, flex: "0 0 44px", width: 44 }}
                                {...(isDuel ? {} : { maxLength: 4 })}
                                value={layer2[li] || ""}
                                onChange={(e) => {
                                  const next = [...layer2];
                                  next[li] = e.target.value;
                                  save(layer1, next);
                                }}
                                placeholder="#"
                              />
                            </span>
                          ))}
                        </span>
                      );
                    })()
                    )
                  ) : isKillstreakOverlayLayout(resolveLayoutIndex(scene.layout, i)) || isKingOverlayLayout(resolveLayoutIndex(scene.layout, i)) ? (
                    <span style={{ display: "flex", flex: 1, gap: 4 }}>
                      <input
                        style={{ ...styles.sceneInput, flex: "0 0 80px" }}
                        value={(scene.text || "").split("|")[0]?.trim() || ""}
                        onChange={(e) => {
                          const parts = (scene.text || "").split("|");
                          const u = parts[1]?.trim() || "";
                          updateScene(i, "text", `${e.target.value}|${u}`);
                        }}
                        placeholder="#"
                      />
                      <input
                        style={{ ...styles.sceneInput, flex: 1 }}
                        maxLength={20}
                        value={(scene.text || "").split("|")[1]?.trim() || ""}
                        onChange={(e) => {
                          const parts = (scene.text || "").split("|");
                          const n = parts[0]?.trim() || "";
                          updateScene(i, "text", `${n}|${e.target.value}`);
                        }}
                        placeholder="Username"
                      />
                    </span>
                  ) : isBattleLayout(resolveLayoutIndex(scene.layout, i)) ? (
                    <span style={{ display: "flex", flex: 1, gap: 4 }}>
                      <input
                        style={{ ...styles.sceneInput, flex: 1 }}
                        value={(scene.text || "").split("|")[0]?.trim() || ""}
                        onChange={(e) => {
                          const parts = (scene.text || "").split("|");
                          const b = parts[1]?.trim() || "";
                          updateScene(i, "text", `${e.target.value}|${b}`);
                        }}
                        placeholder="User A"
                      />
                      <input
                        style={{ ...styles.sceneInput, flex: 1 }}
                        value={(scene.text || "").split("|")[1]?.trim() || ""}
                        onChange={(e) => {
                          const parts = (scene.text || "").split("|");
                          const a = parts[0]?.trim() || "";
                          updateScene(i, "text", `${a}|${e.target.value}`);
                        }}
                        placeholder="User B"
                      />
                    </span>
                  ) : isPrizesGridLayout(resolveLayoutIndex(scene.layout, i)) ? (
                    (() => {
                      const selected = new Set(
                        (scene.text || "").split(",").map((s) => s.trim()).filter(Boolean)
                      );
                      const toggle = (logo: string) => {
                        const next = new Set(selected);
                        if (next.has(logo)) next.delete(logo); else next.add(logo);
                        updateScene(i, "text", [...next].join(","));
                      };
                      return (
                        <details style={{ flex: 1, minWidth: 0 }}>
                          <summary style={{ ...styles.layoutSelect, flex: 1, cursor: "pointer", userSelect: "none" as const, listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <span>{selected.size === 0 ? "All logos" : `${selected.size} logo${selected.size !== 1 ? "s" : ""} selected`}</span>
                            <span style={{ fontSize: 8, color: "#94a3b8", pointerEvents: "none" }}>&#9660;</span>
                          </summary>
                          <div style={{ position: "absolute", zIndex: 100, background: "#1e1e1e", border: "1px solid #444", borderRadius: 4, padding: "4px 0", marginTop: 2, minWidth: 220, maxHeight: 300, overflowY: "auto" as const }}>
                            {PRIZE_LOGOS.map((logo) => {
                              const checked = selected.has(logo);
                              return (
                                <label key={logo} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", cursor: "pointer", background: checked ? "#2a3a2a" : "transparent", fontSize: 12, color: "#e0e0e0" }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggle(logo)} style={{ accentColor: "#4caf50" }} />
                                  {logo.replace(".png", "")}
                                </label>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })()
                  ) : isWeeklyTitleLayout(resolveLayoutIndex(scene.layout, i)) ? (
                    <input
                      type="week"
                      style={styles.sceneInput}
                      value={(() => {
                        // Convert stored "Mon DD – Mon DD" back to week input value
                        // or use the raw ISO week string if stored that way
                        const t = scene.text || "";
                        if (/^\d{4}-W\d{2}$/.test(t)) return t;
                        // Default to current week
                        const now = new Date();
                        const jan1 = new Date(now.getFullYear(), 0, 1);
                        const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
                        const week = Math.ceil((days + jan1.getDay() + 1) / 7);
                        return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
                      })()}
                      onChange={(e) => {
                        const val = e.target.value; // "2026-W14"
                        if (!val) return;
                        // Parse ISO week to Sun–next Sun range
                        const [yearStr, weekStr] = val.split("-W");
                        const year = parseInt(yearStr, 10);
                        const week = parseInt(weekStr, 10);
                        // ISO week 1 contains Jan 4; compute Monday of that week
                        const jan4 = new Date(year, 0, 4);
                        const mon = new Date(jan4);
                        mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
                        // Go back to Sunday (start of week)
                        const sun = new Date(mon);
                        sun.setDate(mon.getDate() - 1);
                        const nextSun = new Date(sun);
                        nextSun.setDate(sun.getDate() + 7);
                        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        const ord = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
                        const rangeText = `${months[sun.getMonth()]} ${ord(sun.getDate())} – ${months[nextSun.getMonth()]} ${ord(nextSun.getDate())}`;
                        updateScene(i, "text", rangeText);
                      }}
                    />
                  ) : (
                    <input
                      style={styles.sceneInput}
                      value={scene.text}
                      onChange={(e) => updateScene(i, "text", e.target.value)}
                      placeholder={`Scene ${i + 1} text...`}
                    />
                  )}
                  <input
                    style={styles.fontSizeInput}
                    type="number"
                    value={scene.fontSize ?? 200}
                    onChange={(e) =>
                      updateScene(i, "fontSize", Number(e.target.value))
                    }
                    title="Font size (px)"
                  />
                  <input
                    style={styles.durationInput}
                    type="number"
                    value={scene.duration ?? DEFAULT_SCENE_DURATION}
                    onChange={(e) =>
                      updateScene(i, "duration", Number(e.target.value))
                    }
                    title="Duration (seconds)"
                    min={1}
                    step={1}
                  />
                  {getLayoutControls(resolveLayoutIndex(scene.layout, i)).some(c => c.type === "videoUpload" || c.type === "videoMute") ? (() => {
                    const isMuted = scene.backgroundVideo?.muted !== false;
                    return (
                      <button
                        type="button"
                        style={{ ...styles.muteIcon, opacity: isMuted ? 0.4 : 0.8 }}
                        title={isMuted ? "Unmute video" : "Mute video"}
                        onClick={() => {
                          const current = scene.backgroundVideo ?? { src: "" };
                          updateScene(i, "backgroundVideo", { ...current, muted: !isMuted });
                        }}
                      >
                        {isMuted ? "🔇" : "🔊"}
                      </button>
                    );
                  })() : (
                    <span style={styles.muteIconSpacer} />
                  )}
                  {props.scenes.length > 1 && (
                    <button
                      style={styles.removeButton}
                      onClick={() => removeScene(i)}
                    >
                      x
                    </button>
                  )}
                </div>
              ))}

              <button
                style={{ ...styles.addButton, width: "100%", padding: "10px 12px" }}
                onClick={() => setShowGallery(true)}
              >
                + Add Scene
              </button>
            </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Gallery Dock */}
      <div
        style={{
          ...styles.dockOverlay,
          pointerEvents: showGallery ? "auto" : "none",
        }}
        onClick={() => setShowGallery(false)}
      >
        <div
          style={{
            ...styles.dockPanel,
            transform: showGallery ? "translateX(0)" : "translateX(100%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
            <div style={styles.dockHeader}>
              <h2 style={{ margin: 0, fontSize: 20, color: "#fff" }}>Scene Gallery</h2>
              <button
                style={styles.dockClose}
                onClick={() => setShowGallery(false)}
              >
                x
              </button>
            </div>
            <div className="dock-body-no-scrollbar" style={styles.dockBody}>
              {Object.entries(categories).map(([category, layouts]) => (
                <div key={category}>
                  <h3 style={styles.categoryHeading}>{category}</h3>
                  <div style={styles.galleryGrid}>
                    {layouts.map((opt) => (
                      <div
                        key={opt.index}
                        style={{ ...styles.galleryCard, cursor: "pointer" }}
                        onClick={() => {
                          const dur = getLayoutDefaultDuration(opt.index);
                          setProps((prev) => ({
                            ...prev,
                            scenes: [...prev.scenes, { text: "", fontSize: 150, layout: opt.index, ...(dur != null ? { duration: dur } : {}) }],
                          }));
                          setShowGallery(false);
                        }}
                      >
                        <div style={styles.galleryPreview}>
                          {thumbMissing[opt.index] ? (
                            <Thumbnail
                              component={HelloWorld}
                              inputProps={{
                                ...props,
                                showIntro: false,
                                showOutro: false,
                                scenes: [{ text: category, fontSize: 100, layout: opt.index }],
                              }}
                              durationInFrames={SCENE_DURATION}
                              fps={FPS}
                              compositionWidth={1080}
                              compositionHeight={1920}
                              frameToDisplay={60}
                              style={{ width: "100%", height: "100%", borderRadius: 8 }}
                            />
                          ) : (
                            <img
                              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/picker/thumbs/${encodeURIComponent(opt.label)}.webp`}
                              alt={opt.label}
                              loading="lazy"
                              onError={() => setThumbMissing((prev) => ({ ...prev, [opt.index]: true }))}
                              style={{ width: "100%", height: "100%", borderRadius: 8, objectFit: "cover" }}
                            />
                          )}
                        </div>
                        <span style={styles.galleryLabel}>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#0a0a0a",
    minHeight: "100vh",
    color: "#e2e8f0",
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 5vw",
    borderBottom: "1px solid #1e293b",
    backgroundColor: "#0a0a0a",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  navbarTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    letterSpacing: 1,
    color: "#ffffff",
  },
  content: {
    padding: "32px 5vw",
  },
  heading: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 32,
    color: "#ffffff",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "260px 1fr 320px",
    gap: 24,
    alignItems: "start",
  },
  preview: {
    borderRadius: 12,
    overflow: "hidden",
  },
  progressBarTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#1e293b",
    cursor: "pointer",
    position: "relative" as const,
    touchAction: "none" as const,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#e2e8f0",
    pointerEvents: "none" as const,
  },
  playerControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "#0d0d15",
  },
  playerCenterControls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  playerIconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    transition: "background 150ms ease, color 150ms ease",
  },
  playerPlayButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    border: "none",
    borderRadius: 999,
    background: "#e2e8f0",
    color: "#0a0a0a",
    cursor: "pointer",
    transition: "background 150ms ease",
  },
  recordingOverlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 9999,
    backgroundColor: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingPlayerWrap: {
    height: "100vh",
    aspectRatio: "9/16",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 24,
    borderRadius: 12,
    border: "1px solid #1e293b",
    backgroundColor: "#111118",
    minWidth: 0,
    overflow: "hidden",
  },
  middleColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
    color: "#94a3b8",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  styleRow: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 8,
  },
  styleLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    color: "#94a3b8",
    flex: 1,
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
    accentColor: "#94a3b8",
  },
  scenesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addButton: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
  },
  scenesList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sceneRow: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  columnHeader: {
    fontSize: 10,
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  sceneNumber: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 600,
    minWidth: 20,
    textAlign: "center" as const,
    flexShrink: 0,
  },
  sceneFixedName: {
    flex: 1,
    padding: "8px 12px",
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: 500,
  },
  sceneInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  colorRow: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  colorLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  colorInput: {
    width: 48,
    height: 48,
    border: "1px solid #334155",
    borderRadius: 8,
    backgroundColor: "transparent",
    cursor: "pointer",
    padding: 2,
  },
  colorName: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "capitalize" as const,
  },
  colorHex: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "monospace",
  },
  layoutSelect: {
    padding: "8px 6px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    minWidth: 0,
    flexShrink: 0,
  },
  attachVideoButton: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px dashed #334155",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: 14,
    cursor: "pointer",
    flexShrink: 0,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  fontSizeInput: {
    width: 56,
    padding: "8px 6px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 13,
    textAlign: "center" as const,
    outline: "none",
    marginLeft: 12,
    flexShrink: 0,
  },
  durationInput: {
    width: 44,
    padding: "8px 4px",
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    fontSize: 13,
    textAlign: "center" as const,
    outline: "none",
    flexShrink: 0,
  },
  downloadButton: {
    marginTop: 12,
    padding: "12px 20px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#e2e8f0",
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  muteIcon: {
    background: "none",
    border: "none",
    padding: 2,
    fontSize: 14,
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
    width: 18,
  },
  muteIconSpacer: {
    width: 18,
    flexShrink: 0,
  },
  removeButton: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: 14,
    cursor: "pointer",
    flexShrink: 0,
  },
  galleryButton: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
  },
  dockOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "transparent",
    zIndex: 1000,
  },
  dockPanel: {
    position: "fixed" as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: 390,
    maxWidth: "90vw",
    backgroundColor: "#111118",
    borderLeft: "1px solid #1e293b",
    boxShadow: "-8px 0 24px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    zIndex: 1001,
    transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)",
    willChange: "transform",
  },
  dockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1e293b",
  },
  dockClose: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 18,
    cursor: "pointer",
    padding: "4px 8px",
  },
  dockBody: {
    padding: 20,
    overflowY: "auto" as const,
    flex: 1,
  },
  categoryHeading: {
    fontSize: 14,
    fontWeight: 600,
    color: "#94a3b8",
    margin: "0 0 12px 0",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 24,
  },
  galleryCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 6,
    cursor: "default",
  },
  galleryPreview: {
    width: "100%",
    aspectRatio: "9/16",
    borderRadius: 8,
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryIndex: {
    fontSize: 24,
    fontWeight: 700,
    color: "#334155",
  },
  galleryLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center" as const,
  },
};
