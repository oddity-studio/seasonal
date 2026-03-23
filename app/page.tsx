"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { HelloWorld } from "@/src/HelloWorld";
import { defaultVideoProps, videoPropsSchema } from "@/src/types";
import type { VideoProps } from "@/src/types";

export default function Home() {
  const [props, setProps] = useState<VideoProps>(defaultVideoProps);

  const update = (key: keyof VideoProps, value: string) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Seasonal Video Creator</h1>

      <div style={styles.main}>
        <div style={styles.preview}>
          <Player
            component={HelloWorld}
            schema={videoPropsSchema}
            inputProps={props}
            durationInFrames={150}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: "100%", aspectRatio: "16/9" }}
            controls
            autoPlay
            loop
          />
        </div>

        <div style={styles.controls}>
          <h2 style={styles.controlsHeading}>Customize</h2>

          <label style={styles.label}>
            Title
            <input
              style={styles.input}
              value={props.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>

          <label style={styles.label}>
            Subtitle
            <input
              style={styles.input}
              value={props.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
            />
          </label>

          <label style={styles.label}>
            Background Color
            <div style={styles.colorRow}>
              <input
                type="color"
                value={props.backgroundColor}
                onChange={(e) => update("backgroundColor", e.target.value)}
              />
              <input
                style={styles.input}
                value={props.backgroundColor}
                onChange={(e) => update("backgroundColor", e.target.value)}
              />
            </div>
          </label>

          <label style={styles.label}>
            Text Color
            <div style={styles.colorRow}>
              <input
                type="color"
                value={props.textColor}
                onChange={(e) => update("textColor", e.target.value)}
              />
              <input
                style={styles.input}
                value={props.textColor}
                onChange={(e) => update("textColor", e.target.value)}
              />
            </div>
          </label>
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
  },
  heading: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 32,
  },
  main: {
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: 32,
    alignItems: "start",
  },
  preview: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 24,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  controlsHeading: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
    color: "#334155",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    outline: "none",
  },
  colorRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
};
