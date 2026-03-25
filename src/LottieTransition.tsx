import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Lottie } from "@remotion/lottie";
import type { LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TRANSITION_DURATION = 30; // frames (0.5s at 60fps)

// Per-URL cache so each transition JSON is fetched once and reused
const cache = new Map<string, LottieAnimationData>();
const pending = new Map<string, Promise<LottieAnimationData>>();

function preloadTransition(url: string): Promise<LottieAnimationData> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);
  let p = pending.get(url);
  if (!p) {
    p = fetch(url)
      .then((res) => res.json())
      .then((data: LottieAnimationData) => {
        cache.set(url, data);
        pending.delete(url);
        return data;
      });
    pending.set(url, p);
  }
  return p;
}

const LottieTransition: React.FC<{
  src?: string;
}> = ({ src }) => {
  const frame = useCurrentFrame();
  const filePath = src || `${BASE}/picker/transitions/flash.json`;
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(cache.get(filePath) ?? null);

  useEffect(() => {
    const cached = cache.get(filePath);
    if (cached) {
      setAnimationData(cached);
      return;
    }
    setAnimationData(null);
    preloadTransition(filePath).then((data) => setAnimationData(data));
  }, [filePath]);

  if (!animationData) {
    // Fallback: simple black flash while loading
    const opacity = frame < TRANSITION_DURATION / 2
      ? frame / (TRANSITION_DURATION / 2)
      : 1 - (frame - TRANSITION_DURATION / 2) / (TRANSITION_DURATION / 2);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: Math.max(0, Math.min(1, opacity)),
          mixBlendMode: "screen",
        }}
      />
    );
  }

  // Animation is 1920x1080 (landscape), video is 1080x1920 (portrait)
  // Scale to cover full height: need width = height * (1920/1080)
  const scaleRatio = (1920 / 1080) * (1920 / 1080); // ~3.16x width relative to container

  return (
    <AbsoluteFill style={{ overflow: "hidden", justifyContent: "center", alignItems: "center", mixBlendMode: "screen" }}>
      <Lottie
        animationData={animationData}
        playbackRate={1}
        style={{ width: `${scaleRatio * 100}%`, height: "100%" }}
      />
    </AbsoluteFill>
  );
};

export { LottieTransition, TRANSITION_DURATION };
