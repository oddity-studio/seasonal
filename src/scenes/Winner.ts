import type { SceneLayout } from "../sceneUtils";
import { BELT1, ARENA } from "../sceneUtils";

const layout: SceneLayout = {
  label: "Winner",
  category: "Tournament",
  characters: [],
  backgroundImageStatic: { src: ARENA, filter: "saturate(0.2)" },
  beltStomp: { src: BELT1 },
  textDefaults: { y: 200, fontSize: 120, rotateX: 10, mode: "flat" },
  customStyle: (c) => ({ background: `linear-gradient(${c.dark}80, ${c.dark}80)`, textColor: "#ffffff", textGlow: "0 4px 30px rgba(0,0,0,0.6)" }),
};

export default layout;
