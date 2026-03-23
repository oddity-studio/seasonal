import { z } from "zod";

export const colorSchemeSchema = z.object({
  dark: z.string(),
  light: z.string(),
  highlight: z.string(),
});

export const sceneSchema = z.object({
  text: z.string(),
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
    { text: "Welcome to the show" },
    { text: "Something amazing happens" },
    { text: "Stay tuned for more" },
  ],
};
