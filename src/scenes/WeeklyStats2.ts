import type { SceneLayout } from "../sceneUtils";

const layout: SceneLayout = {
  label: "Weekly Stats 2",
  category: "Weekly Report",
  characters: [],
  slideLinesOverlay: true,
  slideLinesLabels: ["Most Votes Cast", "Most Comments", "Biggest XP Jump"],
  slideLinesOffsetX: 64,
  polkaDotOverlay: true,
  textDefaults: { y: 0, fontSize: 100, rotateZ: -20, rotateX: -22, perspective: 700 },
  customStyle: (c) => ({ background: `linear-gradient(135deg, ${c.light}, ${c.dark})`, textColor: "#ffffff", textGlow: "0 4px 30px rgba(0,0,0,0.6)" }),
};

export default layout;
