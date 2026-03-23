import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  staticFile,
} from "remotion";
import type { VideoProps, ColorScheme } from "./types";

const SCENE_DURATION = 90; // 3 seconds per scene at 30fps

const CHARACTERS = [
  staticFile("char1.png"),
  staticFile("char2.png"),
  staticFile("char3.png"),
];

// Character positioning presets for fight-game style layouts
type CharPlacement = {
  src: string;
  side: "left" | "right";
  scale: number;
  bottomPct: number; // percentage from bottom
  flip?: boolean;
};

const SCENE_LAYOUTS: CharPlacement[][] = [
  // Layout 0: char1 left, char2 right — face-off
  [
    { src: CHARACTERS[0], side: "left", scale: 1.1, bottomPct: 0 },
    { src: CHARACTERS[1], side: "right", scale: 1.0, bottomPct: 0, flip: true },
  ],
  // Layout 1: char3 center-ish large, menacing
  [
    { src: CHARACTERS[2], side: "left", scale: 1.4, bottomPct: 5 },
  ],
  // Layout 2: char2 left, char3 right
  [
    { src: CHARACTERS[1], side: "left", scale: 1.0, bottomPct: 0 },
    { src: CHARACTERS[2], side: "right", scale: 1.2, bottomPct: 5, flip: true },
  ],
  // Layout 3: all three characters
  [
    { src: CHARACTERS[0], side: "left", scale: 0.9, bottomPct: 0 },
    { src: CHARACTERS[2], side: "right", scale: 1.0, bottomPct: 5, flip: true },
    { src: CHARACTERS[1], side: "left", scale: 0.7, bottomPct: 0 },
  ],
];

const FighterChar: React.FC<{
  placement: CharPlacement;
  frame: number;
  fps: number;
  charIndex: number;
}> = ({ placement, frame, fps, charIndex }) => {
  // Slide in from the side
  const slideIn = spring({ frame, fps, config: { damping: 14, mass: 0.8 }, delay: charIndex * 5 });
  const offscreen = placement.side === "left" ? -600 : 600;
  const slideX = interpolate(slideIn, [0, 1], [offscreen, 0]);

  // Idle bob — fighting stance sway
  const bob = Math.sin(frame * 0.12 + charIndex * 2) * 6;
  // Subtle horizontal sway
  const sway = Math.sin(frame * 0.08 + charIndex * 3) * 4;

  // Exit: scale up and fade out
  const exitStart = SCENE_DURATION - 15;
  const exitProgress = frame > exitStart
    ? interpolate(frame, [exitStart, SCENE_DURATION], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const exitScale = 1 + exitProgress * 0.3;
  const exitOpacity = 1 - exitProgress;

  const isLeft = placement.side === "left";
  const flipX = placement.flip ? -1 : 1;

  return (
    <div
      style={{
        position: "absolute",
        bottom: `${placement.bottomPct}%`,
        [isLeft ? "left" : "right"]: isLeft ? "-5%" : "-5%",
        width: "65%",
        opacity: exitOpacity,
        transform: `translateX(${slideX + sway}px) translateY(${bob}px) scale(${placement.scale * exitScale}) scaleX(${flipX})`,
        transformOrigin: isLeft ? "bottom left" : "bottom right",
        pointerEvents: "none" as const,
      }}
    >
      <Img
        src={placement.src}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
};

const CharacterLayer: React.FC<{ layoutIndex: number }> = ({ layoutIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = SCENE_LAYOUTS[layoutIndex % SCENE_LAYOUTS.length];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {layout.map((placement, ci) => (
        <FighterChar
          key={ci}
          placement={placement}
          frame={frame}
          fps={fps}
          charIndex={ci}
        />
      ))}
    </div>
  );
};

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
      background = `linear-gradient(135deg, ${colors.dark}, #000000)`;
      textColor = colors.highlight;
      break;
    case 1:
      background = `linear-gradient(135deg, ${colors.dark}, ${colors.light}, ${colors.highlight})`;
      textColor = "#000000";
      break;
    case 2:
      background = `linear-gradient(135deg, ${colors.light}, #ffffff)`;
      textColor = colors.dark;
      break;
    case 3:
    default:
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
      {/* Character layer behind text */}
      <CharacterLayer layoutIndex={index} />

      {/* Text overlay */}
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          textAlign: "center",
          padding: "0 80px",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: textColor,
            margin: 0,
            lineHeight: 1.2,
            textShadow: "0 4px 20px rgba(0,0,0,0.7)",
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
          {/* Title characters — all three slide in */}
          <CharacterLayer layoutIndex={3} />

          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              textAlign: "center",
              zIndex: 1,
            }}
          >
            <p
              style={{
                fontSize: 28,
                color: colorScheme.light,
                margin: 0,
                letterSpacing: 6,
                textTransform: "uppercase",
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
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
                textShadow: "0 4px 30px rgba(0,0,0,0.8)",
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
