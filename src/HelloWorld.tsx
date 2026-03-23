import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";
import type { VideoProps } from "./types";

const SCENE_DURATION = 90; // 3 seconds per scene at 30fps

const SceneCard: React.FC<{ text: string; index: number }> = ({
  text,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exitStart = SCENE_DURATION - 15;
  const exit = frame > exitStart ? interpolate(frame, [exitStart, SCENE_DURATION], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const opacity = enter * exit;
  const y = interpolate(enter, [0, 1], [40, 0]);

  const hue = (index * 60 + 200) % 360;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 15%), hsl(${hue + 30}, 50%, 8%))`,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        <p
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {text}
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const HelloWorld: React.FC<VideoProps> = ({ seasonNumber, scenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleOpacity, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Title card */}
      <Sequence durationInFrames={SCENE_DURATION}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #1a1a2e, #0a0a0a)",
          }}
        >
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 28,
                color: "#888",
                margin: 0,
                letterSpacing: 6,
                textTransform: "uppercase",
              }}
            >
              Season
            </p>
            <h1
              style={{
                fontSize: 160,
                fontWeight: 800,
                color: "#fff",
                margin: "10px 0",
                lineHeight: 1,
              }}
            >
              {seasonNumber}
            </h1>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene cards */}
      {scenes.map((scene, i) => (
        <Sequence
          key={i}
          from={SCENE_DURATION * (i + 1)}
          durationInFrames={SCENE_DURATION}
        >
          <SceneCard text={scene.text} index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
