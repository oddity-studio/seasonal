import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { VideoProps } from "./types";

export const HelloWorld: React.FC<VideoProps> = ({
  title,
  subtitle,
  backgroundColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const subtitleOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const titleY = interpolate(titleOpacity, [0, 1], [30, 0]);
  const subtitleY = interpolate(subtitleOpacity, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: 100,
            fontWeight: "bold",
            color: textColor,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 40,
            color: textColor,
            opacity: Math.max(0, subtitleOpacity),
            transform: `translateY(${subtitleY}px)`,
            marginTop: 20,
          }}
        >
          {subtitle}
        </p>
      </div>
    </AbsoluteFill>
  );
};
