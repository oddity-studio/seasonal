"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Player, type PlayerRef, Thumbnail } from "@remotion/player";
import { HelloWorld, LAYOUT_OPTIONS, FONT_OPTIONS, getLayoutControls, isBattleLayout, isWeeklyTitleLayout, isKillstreakOverlayLayout, isKingOverlayLayout, isSlideLinesOverlayLayout, getLayoutDefaultDuration } from "@/src/HelloWorld";
import { defaultVideoProps, videoPropsSchema, FPS, DEFAULT_SCENE_DURATION, getSceneFrames, getTotalFrames } from "@/src/types";
import type { VideoProps, Scene, ColorScheme } from "@/src/types";
import { AUTOMATE_PARSERS } from "./automateParsers";

const SCENE_DURATION = DEFAULT_SCENE_DURATION * FPS;

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
  const [automateText, setAutomateText] = useState("");
  const [thumbMissing, setThumbMissing] = useState<Record<number, boolean>>({});
  const [bakingIdx, setBakingIdx] = useState<number | null>(null);
  const bakeContainerRef = useRef<HTMLDivElement>(null);

  const handleBakeAllThumbs = useCallback(async () => {
    const html2canvas = (await import("html2canvas")).default;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (let i = 0; i < LAYOUT_OPTIONS.length; i++) {
      setBakingIdx(i);
      // wait for DOM + videos/images to settle
      await new Promise((r) => setTimeout(r, 1500));
      const node = bakeContainerRef.current;
      if (!node) continue;
      try {
        const canvas = await html2canvas(node, {
          width: 1080,
          height: 1920,
          windowWidth: 1080,
          windowHeight: 1920,
          backgroundColor: null,
          useCORS: true,
          allowTaint: true,
          logging: false,
          scale: 1,
        });
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
        if (blob) zip.file(`${i}.png`, blob);
      } catch (e) {
        console.error("bake failed for", i, e);
      }
    }
    setBakingIdx(null);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "thumbs.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${BASE}/picker/presets/index.json`)
      .then((r) => r.json())
      .then((names: string[]) => setPresetNames(names))
      .catch(() => {});
  }, []);

  const loadPreset = useCallback((name: string) => {
    const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${BASE}/picker/presets/${encodeURIComponent(name)}.json`)
      .then((r) => r.json())
      .then((data) => {
        const parsed = videoPropsSchema.safeParse(data);
        if (parsed.success) {
          setProps(parsed.data);
          setSelectedPreset(name);
        }
      })
      .catch(() => {});
  }, []);

  // Group layouts by category
  const categories = LAYOUT_OPTIONS.reduce<Record<string, typeof LAYOUT_OPTIONS>>((acc, opt) => {
    (acc[opt.category] ??= []).push(opt);
    return acc;
  }, {});

  const handleSave = useCallback(() => {
    // Strip blob: URLs from backgroundVideo since they're session-only, but keep muted state
    const cleaned = {
      ...props,
      scenes: props.scenes.map((s) => {
        if (s.backgroundVideo?.src?.startsWith("blob:")) {
          const { backgroundVideo, ...rest } = s;
          const muted = backgroundVideo?.muted;
          return muted !== undefined ? { ...rest, backgroundVideo: { src: "", muted } } : rest;
        }
        return s;
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
          setProps(parsed.data);
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

  const addScene = () => {
    setProps((prev) => ({
      ...prev,
      scenes: [...prev.scenes, { text: "", fontSize: 150 }],
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

  return (
    <div style={styles.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ ...styles.heading, marginBottom: 0 }}>VIDEOBOX 2.0</h1>
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
        </div>
      </div>

      <div style={styles.main}>
        <div
          style={recordingMode ? styles.recordingOverlay : styles.preview}
          data-player
        >
          {!recordingMode && (
            <style>{`
              .player-wrap [data-remotion-player-controls] {
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
              }
              .player-wrap:hover [data-remotion-player-controls] {
                opacity: 1 !important;
              }
            `}</style>
          )}
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
              controls={!recordingMode}
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
                : "Download MP4"}
            </button>
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
          )}
        </div>

        {!recordingMode && (
          <div style={styles.controls}>
            <div style={styles.customizeHeader}>
              <h2 style={styles.controlsHeading}>Customize</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  style={styles.layoutSelect}
                  value=""
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
                  style={styles.galleryButton}
                  onClick={() => setShowGallery(true)}
                >
                  Scene Gallery
                </button>
                <button
                  style={styles.galleryButton}
                  onClick={handleBakeAllThumbs}
                  disabled={bakingIdx !== null}
                >
                  {bakingIdx !== null ? `Baking ${bakingIdx + 1}/${LAYOUT_OPTIONS.length}…` : "Bake Thumbs"}
                </button>
              </div>
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

            <div>
              <span style={styles.label}>Style</span>
              <div style={styles.styleRow}>
                <label style={styles.styleLabel}>
                  Music
                  <select
                    style={styles.layoutSelect}
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
                    style={styles.layoutSelect}
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
                    style={styles.layoutSelect}
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
              </div>
            </div>

            {selectedPreset && AUTOMATE_PARSERS[selectedPreset] && (
              <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
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
            )}

            <div style={styles.scenesHeader}>
              <span style={styles.label}>Scenes</span>
              <button style={styles.addButton} onClick={addScene}>
                + Add Scene
              </button>
            </div>

            <div style={styles.scenesList}>
              {/* Column headers */}
              <div style={styles.sceneRow}>
                <span style={styles.sceneNumber}></span>
                <span style={styles.columnHeader}>Design</span>
                <span style={{ flex: 1 }}></span>
                <span style={{ ...styles.columnHeader, width: 56, textAlign: "center" as const }}>Size</span>
                <span style={{ ...styles.columnHeader, width: 44, textAlign: "center" as const }}>Time</span>
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
                    style={styles.layoutSelect}
                    value={scene.layout ?? i}
                    onChange={(e) => {
                      const layoutIdx = Number(e.target.value);
                      updateScene(i, "layout", layoutIdx);
                      const dur = getLayoutDefaultDuration(layoutIdx);
                      if (dur != null) updateScene(i, "duration", dur);
                      if (isKillstreakOverlayLayout(layoutIdx) && !scene.text) {
                        updateScene(i, "text", "99|Player One");
                      }
                      if (isKingOverlayLayout(layoutIdx) && !scene.text) {
                        updateScene(i, "text", "3|Player One");
                      }
                      if (isSlideLinesOverlayLayout(layoutIdx) && !scene.text) {
                        updateScene(i, "text", "Player1|Player2|Player3\n126|89|257");
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
                  {isSlideLinesOverlayLayout(scene.layout ?? i) ? (
                    (() => {
                      const [rawA = "", rawB = ""] = (scene.text || "").split("\n");
                      const layer1 = rawA.split("|");
                      const layer2 = rawB.split("|");
                      while (layer1.length < 3) layer1.push("");
                      while (layer2.length < 3) layer2.push("");
                      const save = (l1: string[], l2: string[]) => {
                        updateScene(i, "text", `${l1.slice(0, 3).join("|")}\n${l2.slice(0, 3).join("|")}`);
                      };
                      return (
                        <span style={{ display: "flex", gap: 4 }}>
                          {[0, 1, 2].map((li) => (
                            <span key={li} style={{ display: "flex", gap: 2 }}>
                              <input
                                style={{ ...styles.sceneInput, width: 90, flex: "0 0 90px" }}
                                value={layer1[li] || ""}
                                onChange={(e) => {
                                  const next = [...layer1];
                                  next[li] = e.target.value;
                                  save(next, layer2);
                                }}
                                placeholder={`Line ${li + 1}`}
                              />
                              <input
                                style={{ ...styles.sceneInput, width: 44, flex: "0 0 44px" }}
                                maxLength={4}
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
                  ) : isKillstreakOverlayLayout(scene.layout ?? i) || isKingOverlayLayout(scene.layout ?? i) ? (
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
                  ) : isBattleLayout(scene.layout ?? i) ? (
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
                  ) : isWeeklyTitleLayout(scene.layout ?? i) ? (
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
                  {getLayoutControls(scene.layout ?? i).map((ctrl, ci) => {
                    if (ctrl.type === "videoUpload") {
                      const isMuted = scene.backgroundVideo?.muted !== false;
                      return (
                        <span key={ci} style={{ display: "contents" }}>
                          <label style={styles.videoUploadButton} title={ctrl.label ?? "Upload video"}>
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
                            {scene.backgroundVideo ? "🎬" : "+🎬"}
                          </label>
                          <button
                            type="button"
                            style={{
                              ...styles.videoUploadButton,
                              opacity: isMuted ? 0.5 : 1,
                            }}
                            title={isMuted ? "Unmute video" : "Mute video"}
                            onClick={() => {
                              const current = scene.backgroundVideo ?? { src: "", scale: 1.5, blendMode: "screen", startFrom: 0 };
                              updateScene(i, "backgroundVideo", { ...current, muted: !isMuted });
                            }}
                          >
                            {isMuted ? "🔇" : "🔊"}
                          </button>
                        </span>
                      );
                    }
                    if (ctrl.type === "videoMute") {
                      const isMuted = scene.backgroundVideo?.muted !== false;
                      return (
                        <button
                          key={ci}
                          type="button"
                          style={{
                            ...styles.videoUploadButton,
                            opacity: isMuted ? 0.5 : 1,
                          }}
                          title={isMuted ? "Unmute video" : "Mute video"}
                          onClick={() => {
                            // Only set `muted` (and keep src if already set) so layout
                            // defaults for scale/blendMode/startFrom are preserved via merge.
                            const current = scene.backgroundVideo ?? { src: "" };
                            updateScene(i, "backgroundVideo", { src: current.src, muted: !isMuted });
                          }}
                        >
                          {isMuted ? "🔇" : "🔊"}
                        </button>
                      );
                    }
                    return null;
                  })}
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

            </div>
          </div>
        )}
      </div>

      {/* Offscreen bake target — fixed 1080x1920, kept out of viewport */}
      {bakingIdx !== null && (
        <div
          ref={bakeContainerRef}
          style={{ position: "fixed", left: 0, top: 0, width: 1080, height: 1920, pointerEvents: "none", opacity: 0, zIndex: -1 }}
        >
          <Thumbnail
            component={HelloWorld}
            inputProps={{
              ...props,
              scenes: [{
                text: LAYOUT_OPTIONS[bakingIdx]?.category ?? "",
                fontSize: 100,
                layout: bakingIdx,
              }],
            }}
            durationInFrames={SCENE_DURATION}
            fps={FPS}
            compositionWidth={1080}
            compositionHeight={1920}
            frameToDisplay={60}
            style={{ width: 1080, height: 1920 }}
          />
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && (
        <div style={styles.modalOverlay} onClick={() => setShowGallery(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: 20, color: "#fff" }}>Scene Gallery</h2>
              <button
                style={styles.modalClose}
                onClick={() => setShowGallery(false)}
              >
                x
              </button>
            </div>
            <div style={styles.modalBody}>
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
                              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/picker/thumbs/${opt.index}.png`}
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
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 20px",
    backgroundColor: "#0a0a0a",
    minHeight: "100vh",
    color: "#e2e8f0",
  },
  heading: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 32,
    color: "#ffffff",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 32,
    alignItems: "start",
  },
  preview: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #1e293b",
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
  },
  controlsHeading: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: "#ffffff",
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
    gap: 8,
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
  },
  videoUploadButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#94a3b8",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
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
  removeButton: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: 14,
    cursor: "pointer",
  },
  customizeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#111118",
    border: "1px solid #1e293b",
    borderRadius: 12,
    width: 640,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1e293b",
  },
  modalClose: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 18,
    cursor: "pointer",
    padding: "4px 8px",
  },
  modalBody: {
    padding: 20,
    overflowY: "auto" as const,
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
    gridTemplateColumns: "repeat(4, 1fr)",
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
