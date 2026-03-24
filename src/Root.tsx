import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { defaultVideoProps, videoPropsSchema } from "./types";
import { TRANSITION_DURATION } from "./LottieTransition";

const SCENE_DURATION = 180;

export const RemotionRoot: React.FC = () => {
  const sceneCount = defaultVideoProps.scenes.length;
  // Title + (transition + scene) for each scene
  const totalFrames = SCENE_DURATION + sceneCount * (SCENE_DURATION + TRANSITION_DURATION);

  return (
    <Composition
      id="HelloWorld"
      component={HelloWorld}
      durationInFrames={totalFrames}
      fps={60}
      width={1080}
      height={1920}
      schema={videoPropsSchema}
      defaultProps={defaultVideoProps}
    />
  );
};
