import { z } from "zod";

export const videoPropsSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
});

export type VideoProps = z.infer<typeof videoPropsSchema>;

export const defaultVideoProps: VideoProps = {
  title: "Hello World",
  subtitle: "Made with Remotion",
  backgroundColor: "#0f172a",
  textColor: "#ffffff",
};
