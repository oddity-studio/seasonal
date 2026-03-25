import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile } from "remotion";
import { Lottie } from "@remotion/lottie";
import type { LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";

const TRANSITION_DURATION = 30; // frames (0.5s at 60fps)

const LottieTransition: React.FC<{
  src?: string;
}> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);
  const [error, setError] = useState(false);

  const filePath = src || staticFile("transitions/flash.json");

  useEffect(() => {
    fetch(filePath)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch(() => setError(true));
  }, [filePath]);

  if (error || !animationData) {
    // Fallback: simple black flash
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
    <AbsoluteFill>
      <Lottie
        animationData={animationData}
        style={{ width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};

export { LottieTransition, TRANSITION_DURATION };
