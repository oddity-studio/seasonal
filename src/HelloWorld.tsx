import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";

export const HelloWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
      }}
    >
      <h1
        style={{
          fontSize: 100,
          fontWeight: "bold",
          opacity,
        }}
      >
        Hello World
      </h1>
    </AbsoluteFill>
  );
};
