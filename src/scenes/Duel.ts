import type { SceneLayout } from "../sceneUtils";

const layout: SceneLayout = {
  label: "Duel",
  category: "Tournament",
  characters: [],
  slideLinesOverlay: true,
  slideLinesLabels: ["VS"],
  slideLinesDuel: true,
  polkaDotOverlay: true,
  textDefaults: { y: 0, fontSize: 100, rotateZ: 25, rotateX: -5, perspective: 700 },
  slideLinesOffsetX: 20,
  customStyle: (c) => ({ background: `linear-gradient(135deg, ${c.light}, ${c.dark})`, textColor: "#ffffff", textGlow: "0 4px 30px rgba(0,0,0,0.6)" }),
};

export default layout;
