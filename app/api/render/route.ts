import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  const props = await req.json();
  const tmpFile = path.join(os.tmpdir(), `seasonal-${Date.now()}.mp4`);
  const entryPoint = path.resolve(process.cwd(), "src/index.ts");
  const sceneDuration = 90;
  const totalFrames = sceneDuration * (props.scenes.length + 1);

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "npx",
        [
          "remotion",
          "render",
          entryPoint,
          "HelloWorld",
          tmpFile,
          "--props",
          JSON.stringify(props),
          "--frames",
          `0-${totalFrames - 1}`,
        ],
        { cwd: process.cwd(), timeout: 300000 },
        (error, _stdout, stderr) => {
          if (error) {
            console.error("Render stderr:", stderr);
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });

    const buffer = fs.readFileSync(tmpFile);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="seasonal.mp4"',
      },
    });
  } catch (error) {
    console.error("Render error:", error);
    return NextResponse.json(
      { error: "Failed to render video" },
      { status: 500 }
    );
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}
