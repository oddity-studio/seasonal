import { AbsoluteFill, Video } from "remotion";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TRANSITION_DURATION = 30; // frames (0.5s at 60fps)

const VideoTransition: React.FC<{
  src?: string;
}> = ({ src }) => {
  const filePath = src || `${BASE}/picker/transitions/flash.webm`;

  // Animation is 1920x1080 (landscape), video is 1080x1920 (portrait)
  // Scale to cover full height: need width = height * (1920/1080)
  const scaleRatio = (1920 / 1080) * (1920 / 1080); // ~3.16x width relative to container

  return (
    <AbsoluteFill style={{ overflow: "hidden", justifyContent: "center", alignItems: "center", mixBlendMode: "screen" }}>
      <Video
        src={filePath}
        muted
        style={{ width: `${scaleRatio * 100}%`, height: "100%" }}
      />
    </AbsoluteFill>
  );
};

export { VideoTransition as LottieTransition, TRANSITION_DURATION };
