"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { HelloWorld } from "@/src/HelloWorld";
import { defaultVideoProps, videoPropsSchema } from "@/src/types";
import type { VideoProps, Scene, ColorScheme } from "@/src/types";

const SCENE_DURATION = 90;

export default function Home() {
  const [props, setProps] = useState<VideoProps>(defaultVideoProps);

  const updateSeason = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    setProps((prev) => ({ ...prev, seasonNumber: digits }));
  };

  const updateScene = (index: number, text: string) => {
    setProps((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s, i) => (i === index ? { text } : s)),
    }));
  };

  const addScene = () => {
    setProps((prev) => ({
      ...prev,
      scenes: [...prev.scenes, { text: "" }],
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
                  onChange={(e) => updateScene(i, e.target.value)}
                  placeholder={`Scene ${i + 1} text...`}
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
