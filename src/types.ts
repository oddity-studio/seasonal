import { z } from "zod";

export const colorSchemeSchema = z.object({
  dark: z.string(),
  light: z.string(),
  highlight: z.string(),
});

export const backgroundVideoSchema = z.object({
  src: z.string(),
  scale: z.number().optional(),
  blendMode: z.string().optional(),
  startFrom: z.number().optional(),
});

export const sceneSchema = z.object({
  text: z.string(),
  fontSize: z.number().optional(),
  y: z.number().optional(),
  x: z.number().optional(),
  rotateZ: z.number().optional(),
  rotateX: z.number().optional(),
  perspective: z.number().optional(),
  backgroundVideo: backgroundVideoSchema.optional(),
});

export const videoPropsSchema = z.object({
  seasonNumber: z.string(),
  colorScheme: colorSchemeSchema,
  scenes: z.array(sceneSchema),
});

export type ColorScheme = z.infer<typeof colorSchemeSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type VideoProps = z.infer<typeof videoPropsSchema>;

export const defaultVideoProps: VideoProps = {
  seasonNumber: "01",
  colorScheme: {
    dark: "#953f0c",
    light: "#dfbf67",
    highlight: "#fefdfb",
  },
  scenes: [
    { text: "Welcome to the show", fontSize: 150, y: 300, x: 0, rotateZ: -12, rotateX: 18 },
    { text: "Something amazing happens", fontSize: 150 },
    { text: "New challengers approach", fontSize: 150 },
    { text: "The battle intensifies", fontSize: 150 },
    { text: "Who will come out on top?", fontSize: 150, y: 300, x: 0, rotateZ: 10, rotateX: -15 },
    { text: "Stay tuned for more", fontSize: 150 },
  ],
};
