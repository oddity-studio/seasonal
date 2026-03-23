export interface VideoProps {
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
}

export const defaultVideoProps: VideoProps = {
  title: "Hello World",
  subtitle: "Made with Remotion",
  backgroundColor: "#0f172a",
  textColor: "#ffffff",
};
