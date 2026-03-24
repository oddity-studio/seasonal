import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { defaultVideoProps, videoPropsSchema } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HelloWorld"
      component={HelloWorld}
      durationInFrames={1260}
      fps={60}
      width={1080}
      height={1920}
      schema={videoPropsSchema}
      defaultProps={defaultVideoProps}
    />
  );
};
