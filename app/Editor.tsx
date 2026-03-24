"use client";

import { useState, useCallback, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { HelloWorld } from "@/src/HelloWorld";
import { defaultVideoProps, videoPropsSchema } from "@/src/types";
import type { VideoProps, Scene, ColorScheme } from "@/src/types";
import html2canvas from "html2canvas";

const SCENE_DURATION = 90;
const FPS = 30;

export default function Editor() {
  const [props, setProps] = useState<VideoProps>(defaultVideoProps);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const playerRef = useRef<PlayerRef>(null);

  const handleDownload = useCallback(async () => {
    const container = document.querySelector("[data-player]");
    if (!container) {
      alert("Cannot find the player element.");
      return;
    }

    // Find the Remotion player content container inside
    const playerContent =
      container.querySelector("[data-remotion-canvas]") ??
      container.querySelector("div[style]");
    if (!playerContent) {
      alert("Cannot find the player content.");
      return;
    }

    setRendering(true);
    setRenderProgress(0);
    try {
      const totalFrames = SCENE_DURATION * (props.scenes.length + 1);

      // Create a recording canvas at composition resolution
      const recordCanvas = document.createElement("canvas");
      recordCanvas.width = 1080;
      recordCanvas.height = 1920;
      const ctx = recordCanvas.getContext("2d")!;

      // Use captureStream(0) for manual frame pushing
      const stream = recordCanvas.captureStream(0);
      const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const done = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();

      // Pause player and capture frame-by-frame
      playerRef.current?.pause();

      for (let frame = 0; frame < totalFrames; frame++) {
        playerRef.current?.seekTo(frame);
        // Wait for React to render the new frame
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const captured = await html2canvas(playerContent as HTMLElement, {
          backgroundColor: "#000000",
          logging: false,
          useCORS: true,
          scale: 1,
        });

        ctx.drawImage(captured, 0, 0, 1080, 1920);
        track.requestFrame();

        setRenderProgress(Math.round(((frame + 1) / totalFrames) * 100));
      }

      recorder.stop();
      await done;

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seasonal.webm";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to record video. Check the console for details.");
    } finally {
      setRendering(false);
      setRenderProgress(0);
    }
  }, [props]);

  const updateSeason = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    setProps((prev) => ({ ...prev, seasonNumber: digits }));
  };

  const updateScene = (index: number, field: keyof Scene, value: string | number) => {
    setProps((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
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

  const totalFrames = SCENE_DURATION * (props.scenes.length + 1);

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Seasonal Video Creator</h1>

      <div style={styles.main}>
        <div style={styles.preview} data-player>
          <Player
            ref={playerRef}
            component={HelloWorld}
            schema={videoPropsSchema}
            inputProps={props}
            durationInFrames={Math.max(1, totalFrames)}
            fps={FPS}
            compositionWidth={1080}
            compositionHeight={1920}
            style={{ width: "100%", aspectRatio: "9/16" }}
            controls
            autoPlay
            loop
            renderLoading={() => (
              <div style={{ width: "100%", aspectRatio: "9/16", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
                <p style={{ color: "#666", fontSize: 14 }}>Loading assets...</p>
              </div>
            )}
          />
          <button
            style={{
              ...styles.downloadButton,
              opacity: rendering ? 0.6 : 1,
              cursor: rendering ? "not-allowed" : "pointer",
            }}
            onClick={handleDownload}
            disabled={rendering}
          >
            {rendering ? `Recording… ${renderProgress}%` : "Download Video"}
          </button>
        </div>

        <div style={styles.controls}>
          <h2 style={styles.controlsHeading}>Customize</h2>

          <label style={styles.label}>
            Season Number
            <input
              style={styles.input}
              value={props.seasonNumber}
              onChange={(e) => updateSeason(e.target.value)}
              placeholder="01"
              maxLength={2}
            />
          </label>

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
                  <span style={styles.colorHex}>{props.colorScheme[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={styles.scenesHeader}>
            <span style={styles.label}>Scenes</span>
            <button style={styles.addButton} onClick={addScene}>
              + Add Scene
            </button>
          </div>

          <div style={styles.scenesList}>
            {props.scenes.map((scene, i) => (
              <div key={i} style={styles.sceneRow}>
                <span style={styles.sceneNumber}>{i + 1}</span>
                <input
                  style={styles.sceneInput}
                  value={scene.text}
                  onChange={(e) => updateScene(i, "text", e.target.value)}
                  placeholder={`Scene ${i + 1} text...`}
                />
                <input
                  style={styles.fontSizeInput}
                  type="number"
                  value={scene.fontSize ?? 200}
                  onChange={(e) => updateScene(i, "fontSize", Number(e.target.value))}
                  title="Font size (px)"
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
      </div>
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
  sceneNumber: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 600,
    minWidth: 20,
    textAlign: "center" as const,
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
};
