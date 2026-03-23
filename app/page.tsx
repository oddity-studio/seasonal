"use client";

import { useState, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import { HelloWorld } from "@/src/HelloWorld";
import { defaultVideoProps, videoPropsSchema } from "@/src/types";
import type { VideoProps, Scene, ColorScheme } from "@/src/types";

const SCENE_DURATION = 90;

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const PRELOAD_IMAGES = [
  `${BASE}/char1.png`,
  `${BASE}/char2.png`,
  `${BASE}/char3.png`,
  `${BASE}/logo.webp`,
];

function preloadImages(): Promise<void[]> {
  return Promise.all(
    PRELOAD_IMAGES.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // don't block on failure
          img.src = src;
        })
    )
  );
}

function LandingPage({ onReady }: { onReady: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    preloadImages().then(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) return;
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(id);
  }, [loaded]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0, color: "#fff" }}>
        Seasonal
      </h1>
      <p style={{ fontSize: 16, color: "#94a3b8", margin: 0 }}>
        Programmatic video creator
      </p>

      {loaded ? (
        <button
          onClick={onReady}
          style={{
            marginTop: 24,
            padding: "14px 40px",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            backgroundColor: "#e2e8f0",
            color: "#0a0a0a",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Open Editor
        </button>
      ) : (
        <p style={{ fontSize: 14, color: "#64748b", margin: 0, marginTop: 24 }}>
          Loading assets{dots}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [props, setProps] = useState<VideoProps>(defaultVideoProps);

  const handleReady = useCallback(() => setReady(true), []);

  if (!ready) {
    return <LandingPage onReady={handleReady} />;
  }

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
        <div style={styles.preview}>
          <Player
            component={HelloWorld}
            schema={videoPropsSchema}
            inputProps={props}
            durationInFrames={Math.max(1, totalFrames)}
            fps={30}
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
