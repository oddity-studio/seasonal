import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
} from "remotion";
import type { VideoProps, ColorScheme } from "./types";
import { loadFont } from "@remotion/google-fonts/DelaGothicOne";

const { fontFamily } = loadFont();

const SCENE_DURATION = 90; // 3 seconds per scene at 30fps

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const CHAR1 = `${BASE}/char1.png`;
const CHAR2 = `${BASE}/char2.png`;
const CHAR3 = `${BASE}/char3.png`;
const LOGO = `${BASE}/logo.webp`;

// Character positioning presets for fight-game style layouts
type CharPlacement = {
  src: string;
  side: "left" | "right";
  scale: number;
  bottomPct: number; // percentage from bottom
  flip?: boolean;
  offsetX?: number; // px offset after slide-in
  widthPct?: number; // if set, size by width % instead of full height
  leftPct?: number; // explicit left position in %
};

const SCENE_LAYOUTS: CharPlacement[][] = [
  // Scene 0: char1 vs char2 face-off
  [
    { src: CHAR1, side: "left", scale: 1.2, bottomPct: 0 },
    { src: CHAR2, side: "right", scale: 1.1, bottomPct: 0, flip: true },
  ],
  // Scene 1: char3 solo hero shot
  [
    { src: CHAR3, side: "left", scale: 1.25, bottomPct: 0, offsetX: -700 },
  ],
  // Scene 2: char2 vs char3
  [
    { src: CHAR2, side: "left", scale: 1.1, bottomPct: 0 },
    { src: CHAR3, side: "right", scale: 1.1, bottomPct: 0, flip: true },
  ],
  // Scene 3: char1 solo hero shot from right
  [
    { src: CHAR1, side: "right", scale: 1.3, bottomPct: 0, flip: true, offsetX: 80 },
  ],
  // Scene 4: char1 vs char3 showdown
  [
    { src: CHAR1, side: "left", scale: 1.15, bottomPct: 0 },
    { src: CHAR3, side: "right", scale: 1.15, bottomPct: 0, flip: true },
  ],
  // Scene 5: all three — group shot
  [
    { src: CHAR1, side: "left", scale: 1.0, bottomPct: 0 },
    { src: CHAR3, side: "right", scale: 1.1, bottomPct: 0, flip: true },
    { src: CHAR2, side: "left", scale: 0.8, bottomPct: 0 },
  ],
  // Scene 6: char2 solo hero shot
  [
    { src: CHAR2, side: "left", scale: 1.25, bottomPct: 0, offsetX: -60 },
  ],
  // Scene 7: title — all three side by side, each 1/3 width
  [
    { src: CHAR1, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 0, offsetX: 200 },
    { src: CHAR3, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 33.33, offsetX: -200 },
    { src: CHAR2, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 66.66 },
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
  const restX = placement.offsetX ?? 0;
  const slideX = interpolate(slideIn, [0, 1], [offscreen, restX]);

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
  const useWidth = placement.widthPct != null;

  if (useWidth) {
    // Column mode: fixed-width container clips a full-height image
    return (
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: `${placement.leftPct ?? 0}%`,
          width: `${placement.widthPct}%`,
          height: "100%",
          overflow: "hidden",
          opacity: exitOpacity,
          pointerEvents: "none" as const,
        }}
      >
        <Img
          src={placement.src}
          style={{
            height: "100%",
            width: "auto",
            display: "block",
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: `translateX(calc(-50% + ${slideX + sway}px)) translateY(${bob}px) scale(${placement.scale * exitScale}) scaleX(${flipX})`,
            transformOrigin: "bottom center",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: `${placement.bottomPct - 2}%`,
        left: isLeft ? "-5%" : undefined,
        right: isLeft ? undefined : "-5%",
        height: "100%",
        opacity: exitOpacity,
        transform: `translateX(${slideX + sway}px) translateY(${bob}px) scale(${placement.scale * exitScale}) scaleX(${flipX})`,
        transformOrigin: isLeft ? "bottom left" : "bottom right",
        pointerEvents: "none" as const,
      }}
    >
      <Img
        src={placement.src}
        style={{ height: "100%", width: "auto", display: "block" }}
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

// Glass shatter shards — pre-computed triangular fragments
const SHARDS: { polygon: string; cx: number; cy: number }[] = [
  { polygon: "0% 0%, 25% 0%, 15% 20%", cx: 13, cy: 7 },
  { polygon: "25% 0%, 55% 0%, 40% 25%, 15% 20%", cx: 34, cy: 11 },
  { polygon: "55% 0%, 80% 0%, 70% 18%, 40% 25%", cx: 61, cy: 11 },
  { polygon: "80% 0%, 100% 0%, 100% 22%, 70% 18%", cx: 88, cy: 10 },
  { polygon: "0% 0%, 15% 20%, 8% 45%", cx: 8, cy: 22 },
  { polygon: "15% 20%, 40% 25%, 50% 50%, 8% 45%", cx: 28, cy: 35 },
  { polygon: "40% 25%, 70% 18%, 100% 22%, 92% 55%, 50% 50%", cx: 70, cy: 34 },
  { polygon: "0% 45%, 8% 45%, 50% 50%, 20% 70%", cx: 20, cy: 52 },
  { polygon: "50% 50%, 92% 55%, 100% 22%, 100% 60%, 75% 72%", cx: 83, cy: 52 },
  { polygon: "50% 50%, 75% 72%, 55% 80%", cx: 60, cy: 67 },
  { polygon: "0% 45%, 20% 70%, 10% 85%, 0% 100%", cx: 8, cy: 75 },
  { polygon: "20% 70%, 55% 80%, 45% 100%, 0% 100%, 10% 85%", cx: 26, cy: 87 },
  { polygon: "55% 80%, 75% 72%, 100% 60%, 100% 100%, 45% 100%", cx: 75, cy: 82 },
];

// Computes per-shard transform for the glass shatter effect.
// Returns null when the effect hasn't started yet.
function getShatterTransforms(frame: number): { dx: number; dy: number; rotate: number; scale: number; opacity: number }[] | null {
  const shatterStart = SCENE_DURATION - 20;
  if (frame < shatterStart) return null;

  const progress = interpolate(frame, [shatterStart, SCENE_DURATION], [0, 1], {
    extrapolateRight: "clamp",
  });

  return SHARDS.map((shard, i) => {
    const delay = (i % 4) * 0.06;
    const p = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
    const eased = p * p;

    return {
      dx: (shard.cx - 50) * 6 * eased,
      dy: (shard.cy - 50) * 6 * eased,
      rotate: ((i % 2 === 0 ? 1 : -1) * 60 + i * 20) * eased,
      scale: 1 + eased * 0.3,
      opacity: 1 - eased * eased,
    };
  });
}

const SceneCard: React.FC<{ text: string; index: number; colors: ColorScheme; fontSize?: number }> = ({
  text,
  index,
  colors,
  fontSize = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const useShatter = index % 2 === 0;
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exitStart = SCENE_DURATION - (useShatter ? 20 : 15);
  const exit = (!useShatter && frame > exitStart) ? interpolate(frame, [exitStart, SCENE_DURATION], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const opacity = enter * exit;
  const y = interpolate(enter, [0, 1], [40, 0]);

  // Scene style variants cycling through the color scheme + black/white
  const variant = index % 4;
  let background: string;
  let textColor: string;

  let textGlow = "0 4px 20px rgba(0,0,0,0.7)";

  switch (variant) {
    case 0:
      background = `linear-gradient(135deg, ${colors.dark}, #000000)`;
      textColor = colors.highlight;
      break;
    case 1:
      background = `linear-gradient(135deg, ${colors.dark}, ${colors.light}, ${colors.highlight})`;
      textColor = "#000000";
      textGlow = `0 0 20px color-mix(in srgb, ${colors.light} 80%, transparent), 0 0 40px color-mix(in srgb, ${colors.light} 50%, transparent), 0 0 80px color-mix(in srgb, ${colors.light} 30%, transparent)`;
      break;
    case 2:
      background = `linear-gradient(135deg, ${colors.light}, #ffffff)`;
      textColor = colors.dark;
      textGlow = `0 0 20px color-mix(in srgb, ${colors.light} 80%, transparent), 0 0 40px color-mix(in srgb, ${colors.light} 50%, transparent), 0 0 80px color-mix(in srgb, ${colors.light} 30%, transparent)`;
      break;
    case 3:
    default:
      background = `linear-gradient(135deg, #000000, ${colors.dark})`;
      textColor = "#ffffff";
      break;
  }

  const angles = [
    { z: -12, x: 18 },
    { z: 10, x: -15 },
    { z: -15, x: 22 },
    { z: 8, x: -20 },
    { z: -18, x: 14 },
    { z: 14, x: -18 },
    { z: -10, x: 25 },
  ];
  const a = angles[index % angles.length];

  // The full scene content rendered as a fragment so it can be reused in shards
  const sceneContent = (
    <>
      <CharacterLayer layoutIndex={index} />
      <div
        style={{
          opacity,
          transform: `translateY(${y}px) perspective(400px) rotateZ(${a.z}deg) rotateX(${a.x}deg)`,
          textAlign: "center",
          padding: "0 80px",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontSize,
            fontFamily,
            fontWeight: 700,
            color: textColor,
            margin: 0,
            lineHeight: 1.0,
            letterSpacing: 8,
            textTransform: "uppercase",
            textShadow: textGlow,
            mixBlendMode: variant === 1 || variant === 2 ? "overlay" : "screen",
          }}
        >
          {text}
        </p>
      </div>
    </>
  );

  const shatterTransforms = useShatter ? getShatterTransforms(frame) : null;

  // If shatter is active, render scene copies clipped to each shard polygon
  if (shatterTransforms) {
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        {SHARDS.map((shard, i) => {
          const t = shatterTransforms[i];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `polygon(${shard.polygon})`,
                transform: `translate(${t.dx}%, ${t.dy}%) rotate(${t.rotate}deg) scale(${t.scale})`,
                opacity: t.opacity,
                willChange: "transform, opacity",
              }}
            >
              {/* Each shard shows the full scene, clipped */}
              <AbsoluteFill
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  background,
                }}
              >
                {sceneContent}
              </AbsoluteFill>
              {/* Bright edge highlight per shard */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "2px solid rgba(255,255,255,0.5)",
                  clipPath: `polygon(${shard.polygon})`,
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background,
      }}
    >
      {sceneContent}
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
          {/* Title characters — all three side by side */}
          <CharacterLayer layoutIndex={7} />

          {/* Flashy logo */}
          {(() => {
            const logoScale = spring({ frame, fps, config: { damping: 10, stiffness: 80, mass: 0.5 } });
            const logoPulse = Math.sin(frame * 0.15) * 0.08;
            const logoRotate = Math.sin(frame * 0.1) * 3;
            const glowIntensity = Math.sin(frame * 0.2) * 20 + 30;
            return (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) scale(${logoScale + logoPulse}) rotate(${logoRotate}deg)`,
                  zIndex: 10,
                  filter: `drop-shadow(0 0 ${glowIntensity}px rgba(255,255,255,0.8)) drop-shadow(0 0 ${glowIntensity * 2}px ${colorScheme.highlight})`,
                }}
              >
                <Img
                  src={LOGO}
                  style={{ width: 1000, height: "auto" }}
                />
              </div>
            );
          })()}

          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px) perspective(400px) rotateZ(-14deg) rotateX(20deg)`,
              textAlign: "center",
              zIndex: 1,
            }}
          >
            <p
              style={{
                fontFamily,
                fontSize: 48,
                color: colorScheme.light,
                margin: 0,
                letterSpacing: 10,
                textTransform: "uppercase",
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              Season
            </p>
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
          <SceneCard text={scene.text} index={i} colors={colorScheme} fontSize={scene.fontSize} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
