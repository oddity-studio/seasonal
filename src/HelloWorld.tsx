import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Img,
  Video,
  Audio,
} from "remotion";
import type { VideoProps, ColorScheme, Scene } from "./types";
import { LottieTransition, TRANSITION_DURATION } from "./LottieTransition";
import { loadFont as loadDelaGothicOne } from "@remotion/google-fonts/DelaGothicOne";
import { loadFont as loadExo2 } from "@remotion/google-fonts/Exo2";
import { loadFont as loadPermanentMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBigShoulders } from "@remotion/google-fonts/BigShoulders";
import { loadFont as loadBowlbyOneSC } from "@remotion/google-fonts/BowlbyOneSC";
import { loadFont as loadFugazOne } from "@remotion/google-fonts/FugazOne";
import { loadFont as loadPassionOne } from "@remotion/google-fonts/PassionOne";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";

const FONT_MAP: Record<string, string> = {
  "Dela Gothic One": loadDelaGothicOne().fontFamily,
  "Exo 2": loadExo2().fontFamily,
  "Permanent Marker": loadPermanentMarker().fontFamily,
  "Anton": loadAnton().fontFamily,
  "Big Shoulders": loadBigShoulders().fontFamily,
  "Bowlby One SC": loadBowlbyOneSC().fontFamily,
  "Fugaz One": loadFugazOne().fontFamily,
  "Passion One": loadPassionOne().fontFamily,
  "Montserrat": loadMontserrat().fontFamily,
};

export const FONT_OPTIONS = Object.keys(FONT_MAP);

const SCENE_DURATION = 180; // 3 seconds per scene at 60fps

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
  opacity?: number; // base opacity (defaults to 1)
};

type SceneLayout = {
  label: string;
  characters: CharPlacement[];
  backgroundVideo?: { src: string; scale?: number; blendMode?: string; startFrom?: number };
  textDefaults?: { x?: number; y?: number; fontSize?: number };
};

const SCENE_LAYOUTS: SceneLayout[] = [
  // 0: char1 vs char2 face-off
  { label: "S12 Scene1", characters: [
    { src: CHAR1, side: "left", scale: 1.2, bottomPct: 0 },
    { src: CHAR2, side: "right", scale: 1.1, bottomPct: 0, flip: true },
  ] },
  // 1: char3 solo hero shot
  { label: "S12 Scene2", characters: [
    { src: CHAR3, side: "left", scale: 1.25, bottomPct: 0, offsetX: -700 },
  ] },
  // 2: char2 vs char3
  { label: "S12 Scene3", characters: [
    { src: CHAR2, side: "left", scale: 1.1, bottomPct: 0 },
    { src: CHAR3, side: "right", scale: 1.1, bottomPct: 0, flip: true },
  ], textDefaults: { x: 80, fontSize: 204 } },
  // 3: char1 solo hero shot from right + background video
  { label: "Video Cube", characters: [
    { src: CHAR1, side: "right", scale: 1.3, bottomPct: 0, flip: true, offsetX: 80 },
  ], backgroundVideo: { src: "/video.mp4", scale: 1.5, blendMode: "screen", startFrom: 300 }, textDefaults: { y: 200 } },
  // 4: char1 vs char3 showdown
  { label: "S12 Scene5", characters: [
    { src: CHAR1, side: "left", scale: 1.15, bottomPct: 0 },
    { src: CHAR3, side: "right", scale: 1.15, bottomPct: 0, flip: true },
  ], textDefaults: { y: 200 } },
  // 5: all three — group shot
  { label: "S12 Scene6", characters: [
    { src: CHAR3, side: "left", scale: 1.2, bottomPct: 0, opacity: 0.5, offsetX: -500 },
    { src: CHAR2, side: "left", scale: 0.8, bottomPct: 0 },
  ] },
  // 6: char2 solo hero shot
  { label: "S12 Scene7", characters: [
    { src: CHAR2, side: "left", scale: 1.25, bottomPct: 0, offsetX: -60 },
  ] },
  // 7: title — all three side by side, each 1/3 width
  { label: "S12 Cover", characters: [
    { src: CHAR1, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 0, offsetX: 200 },
    { src: CHAR3, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 33.33, offsetX: -200 },
    { src: CHAR2, side: "left", scale: 1, bottomPct: 0, widthPct: 33.33, leftPct: 66.66 },
  ] },
];

export const LAYOUT_OPTIONS = SCENE_LAYOUTS.map((l, i) => ({ index: i, label: l.label }));

const FighterChar: React.FC<{
  placement: CharPlacement;
  frame: number;
  fps: number;
  charIndex: number;
}> = ({ placement, frame, fps, charIndex }) => {
  // Slide in from the side
  const slideIn = spring({ frame, fps, config: { damping: 14, mass: 0.8 }, delay: charIndex * 10 });
  const offscreen = placement.side === "left" ? -600 : 600;
  const restX = placement.offsetX ?? 0;
  const slideX = interpolate(slideIn, [0, 1], [offscreen, restX]);

  // Idle bob — fighting stance sway
  const bob = Math.sin(frame * 0.06 + charIndex * 2) * 6;
  // Subtle horizontal sway
  const sway = Math.sin(frame * 0.04 + charIndex * 3) * 4;

  // Exit: scale up and fade out
  const exitStart = SCENE_DURATION - 30;
  const exitProgress = frame > exitStart
    ? interpolate(frame, [exitStart, SCENE_DURATION], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const exitScale = 1 + exitProgress * 0.3;
  const baseOpacity = placement.opacity ?? 1;
  const exitOpacity = baseOpacity * (1 - exitProgress);

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
            willChange: "transform",
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
        willChange: "transform, opacity",
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
      {layout.characters.map((placement, ci) => (
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

const SceneCard: React.FC<{ text: string; index: number; layoutIndex: number; colors: ColorScheme; fontFamily: string; fontSize?: number; y?: number; x?: number; rotateZ?: number; rotateX?: number; perspective?: number; backgroundVideo?: Scene["backgroundVideo"] }> = ({
  text,
  index,
  layoutIndex,
  colors,
  fontFamily,
  fontSize = 150,
  y: yOffset = 0,
  x: xOffset = 0,
  rotateZ: rZ,
  rotateX: rX,
  perspective: persp,
  backgroundVideo: backgroundVideoProp,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Use scene-level values if provided, otherwise fall back to layout defaults
  const resolvedLayout = SCENE_LAYOUTS[layoutIndex % SCENE_LAYOUTS.length];
  const td = resolvedLayout.textDefaults;
  const backgroundVideo = backgroundVideoProp ?? resolvedLayout.backgroundVideo;
  const resolvedFontSize = fontSize ?? td?.fontSize ?? 150;
  const resolvedX = xOffset || td?.x || 0;
  const resolvedY = yOffset || td?.y || 0;

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exitStart = SCENE_DURATION - 30;
  const exit = frame > exitStart ? interpolate(frame, [exitStart, SCENE_DURATION], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const opacity = enter * exit;
  const y = interpolate(enter, [0, 1], [40, 0]) + resolvedY;

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

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background,
      }}
    >
      {/* Background video layer */}
      {backgroundVideo && (
        <AbsoluteFill
          style={{
            overflow: "hidden",
            mixBlendMode: (backgroundVideo.blendMode as React.CSSProperties["mixBlendMode"]) ?? "normal",
          }}
        >
          <Video
            src={`${BASE}${backgroundVideo.src}`}
            muted
            startFrom={backgroundVideo.startFrom ?? 0}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${backgroundVideo.scale ?? 1})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Character layer behind text */}

      <CharacterLayer layoutIndex={layoutIndex} />

      {/* Text overlay */}
      {(() => {
        const defaultAngles = [
          { z: -12, x: 18 },
          { z: 10, x: -15 },
          { z: -15, x: 22 },
          { z: 8, x: -20 },
          { z: -18, x: 14 },
          { z: 14, x: -18 },
          { z: -10, x: 25 },
        ];
        const fallback = defaultAngles[index % defaultAngles.length];
        const a = { z: rZ ?? fallback.z, x: rX ?? fallback.x };
        const perspectiveVal = persp ?? 400;

        const words = text.split(" ");
        const totalWords = words.length;
        const revealWindow = SCENE_DURATION - 50;
        const lineHeight = resolvedFontSize * 1.1;

        const wordSprings = words.map((_, wi) => {
          const wordDelay = totalWords > 1 ? (wi / (totalWords - 1)) * revealWindow * 0.6 : 0;
          return spring({ frame, fps, config: { damping: 14, mass: 0.6 }, delay: wordDelay });
        });

        // Shift container up so the newest word stays at screen center
        const visibleProgress = wordSprings.reduce((sum, s) => sum + s, 0);
        const shiftUp = Math.max(0, visibleProgress - 1) * lineHeight;

        return (
          <div
            style={{
              opacity: exit,
              transform: `perspective(${perspectiveVal}px) rotateZ(${a.z}deg) rotateX(${a.x}deg) translateX(${resolvedX}px) translateY(${y}px)`,
              textAlign: "center",
              padding: "0 80px",
              zIndex: 1,
            }}
          >
            <div
              style={{
                transform: `translateY(${-shiftUp}px)`,
              }}
            >
            {words.map((word, wi) => {
              const wordY = interpolate(wordSprings[wi], [0, 1], [30, 0]);
              return (
                <p
                  key={wi}
                  style={{
                    fontSize: resolvedFontSize,
                    fontFamily,
                    fontWeight: 700,
                    color: textColor,
                    margin: 0,
                    lineHeight: 1.0,
                    letterSpacing: 8,
                    textTransform: "uppercase",
                    textShadow: textGlow,
                    mixBlendMode: variant === 1 || variant === 2 ? "overlay" : "screen",
                    opacity: wordSprings[wi],
                    transform: `translateY(${wordY}px)`,
                  }}
                >
                  {word}
                </p>
              );
            })}
            </div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ colorScheme: VideoProps["colorScheme"]; layoutIndex: number; fontFamily: string }> = ({ colorScheme, layoutIndex, fontFamily }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleOpacity, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(135deg, #000000, ${colorScheme.dark})`,
      }}
    >
      <CharacterLayer layoutIndex={layoutIndex} />

      {/* Flashy logo */}
      {(() => {
        const logoScale = spring({ frame, fps, config: { damping: 10, stiffness: 80, mass: 0.5 } });
        const logoPulse = Math.sin(frame * 0.075) * 0.08;
        const logoRotate = Math.sin(frame * 0.05) * 3;
        const glowIntensity = Math.sin(frame * 0.1) * 20 + 30;
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
  );
};

export const HelloWorld: React.FC<VideoProps> = ({ seasonNumber, colorScheme, scenes, showIntro = true, introLayout = 7, showOutro = false, outroLayout = 7, music = "Tournament.mp3", transition = "flash.json", font = "Dela Gothic One" }) => {
  const fontFamily = FONT_MAP[font] || FONT_MAP["Dela Gothic One"];
  const introFrames = showIntro ? SCENE_DURATION : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Intro title card */}
      {showIntro && (
        <Sequence durationInFrames={SCENE_DURATION}>
          <TitleCard colorScheme={colorScheme} fontFamily={fontFamily} layoutIndex={introLayout} />
        </Sequence>
      )}

      {/* Background music */}
      <Audio src={`${BASE}/picker/music/${music}`} volume={1} />

      {/* Scene cards with Lottie transitions overlaid at scene start */}
      {scenes.map((scene, i) => {
        const sceneStart = introFrames + i * SCENE_DURATION;
        const transitionOffset = transition === "flash.json" ? 12 : 18;
        return (
          <React.Fragment key={i}>
            {/* Scene card */}
            <Sequence
              from={sceneStart}
              durationInFrames={SCENE_DURATION}
            >
              <SceneCard text={scene.text} index={i} layoutIndex={scene.layout ?? i} colors={colorScheme} fontFamily={fontFamily} fontSize={scene.fontSize} y={scene.y} x={scene.x} rotateZ={scene.rotateZ} rotateX={scene.rotateX} perspective={scene.perspective} backgroundVideo={scene.backgroundVideo} />
            </Sequence>
            {/* Lottie transition overlay */}
            <Sequence
              from={sceneStart - transitionOffset}
              durationInFrames={TRANSITION_DURATION}
            >
              <LottieTransition src={`${BASE}/picker/transitions/${transition}`} />
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* Outro title card */}
      {showOutro && (
        <Sequence from={introFrames + scenes.length * SCENE_DURATION} durationInFrames={SCENE_DURATION}>
          <TitleCard colorScheme={colorScheme} fontFamily={fontFamily} layoutIndex={outroLayout} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
