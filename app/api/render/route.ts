import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import type { VideoProps } from "@/src/types";

export async function POST(req: Request) {
  let outputPath = "";
  let bundled = "";

  try {
    const props: VideoProps = await req.json();

    bundled = await bundle({
      entryPoint: path.resolve(process.cwd(), "src/index.ts"),
      webpackOverride: (config) => config,
    });

    const composition = await selectComposition({
      serveUrl: bundled,
      id: "HelloWorld",
      inputProps: props,
    });

    outputPath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: props,
    });

    const file = fs.readFileSync(outputPath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="video.mp4"',
      },
    });
  } catch (err) {
    console.error("Render error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render failed" },
      { status: 500 }
    );
  } finally {
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    if (bundled && fs.existsSync(bundled)) {
      fs.rmSync(bundled, { recursive: true, force: true });
    }
  }
}
