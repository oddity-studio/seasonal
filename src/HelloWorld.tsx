import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";
import type { VideoProps, ColorScheme } from "./types";

const SCENE_DURATION = 90; // 3 seconds per scene at 30fps

const SceneCard: React.FC<{ text: string; index: number; colors: ColorScheme }> = ({
  text,
  index,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exitStart = SCENE_DURATION - 15;
  const exit = frame > exitStart ? interpolate(frame, [exitStart, SCENE_DURATION], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const opacity = enter * exit;
  const y = interpolate(enter, [0, 1], [40, 0]);

  // Scene style variants cycling through the color scheme + black/white
  const variant = index % 4;
  let background: string;
  let textColor: string;

  switch (variant) {
    case 0:
      // Dark bg with gradient into black, highlight text
      background = `linear-gradient(135deg, ${colors.dark}, #000000)`;
      textColor = colors.highlight;
      break;
    case 1:
      // Tri-color gradient of all three scheme colors
      background = `linear-gradient(135deg, ${colors.dark}, ${colors.light}, ${colors.highlight})`;
      textColor = "#000000";
      break;
    case 2:
      // Light bg fading to white, dark text
      background = `linear-gradient(135deg, ${colors.light}, #ffffff)`;
      textColor = colors.dark;
      break;
    case 3:
    default:
      // Black bg with highlight accent gradient, white text
      background = `linear-gradient(135deg, #000000, ${colors.dark})`;
      textColor = "#ffffff";
      break;
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background,
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
            color: textColor,
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

export const HelloWorld: React.FC<VideoProps> = ({ seasonNumber, colorScheme, scenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleOpacity, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Title card */}
      <Sequence durationInFrames={SCENE_DURATION}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            background: `linear-gradient(135deg, #000000, ${colorScheme.dark})`,
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
                color: colorScheme.light,
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
                color: colorScheme.highlight,
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
          <SceneCard text={scene.text} index={i} colors={colorScheme} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
