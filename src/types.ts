import { z } from "zod";

export const sceneSchema = z.object({
  text: z.string(),
});

export const videoPropsSchema = z.object({
  seasonNumber: z.string(),
  scenes: z.array(sceneSchema),
});

export type Scene = z.infer<typeof sceneSchema>;
export type VideoProps = z.infer<typeof videoPropsSchema>;

export const defaultVideoProps: VideoProps = {
  seasonNumber: "01",
  scenes: [
    { text: "Welcome to the show" },
    { text: "Something amazing happens" },
    { text: "Stay tuned for more" },
  ],
};
