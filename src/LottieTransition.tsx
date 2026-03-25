import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Lottie } from "@remotion/lottie";
import type { LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TRANSITION_DURATION = 30; // frames (0.5s at 60fps)

// Module-level cache so the JSON is fetched once and reused across all mounts
let cachedData: LottieAnimationData | null = null;
let fetchPromise: Promise<LottieAnimationData> | null = null;

function preloadTransition(url: string): Promise<LottieAnimationData> {
  if (cachedData) return Promise.resolve(cachedData);
  if (!fetchPromise) {
    fetchPromise = fetch(url)
      .then((res) => res.json())
      .then((data: LottieAnimationData) => {
        cachedData = data;
        return data;
      });
  }
  return fetchPromise;
}

const LottieTransition: React.FC<{
  src?: string;
}> = ({ src }) => {
  const frame = useCurrentFrame();
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(cachedData);

  const filePath = src || `${BASE}/transitions/flash.json`;

  useEffect(() => {
    if (animationData) return;
    preloadTransition(filePath).then((data) => setAnimationData(data));
  }, [filePath, animationData]);

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
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Lottie
        animationData={animationData}
        playbackRate={1}
        style={{ width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};

export { LottieTransition, TRANSITION_DURATION };
