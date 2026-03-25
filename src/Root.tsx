import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { defaultVideoProps, videoPropsSchema } from "./types";
const SCENE_DURATION = 180;

export const RemotionRoot: React.FC = () => {
  const sceneCount = defaultVideoProps.scenes.length;
  const introFrames = defaultVideoProps.showIntro !== false ? SCENE_DURATION : 0;
  const outroFrames = defaultVideoProps.showOutro ? SCENE_DURATION : 0;
  const totalFrames = introFrames + sceneCount * SCENE_DURATION + outroFrames;

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
