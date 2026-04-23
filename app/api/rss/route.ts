import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FEEDS: Record<string, string> = {
  "weekly-top-battles":
    "https://www.audeobox.com/api/feeds/weekly-top-battles.xml",
};

export async function GET(req: NextRequest) {
  const feed = req.nextUrl.searchParams.get("feed");
  const url = feed ? ALLOWED_FEEDS[feed] : null;
  if (!url) {
    return NextResponse.json({ error: "unknown feed" }, { status: 400 });
  }
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    const xml = await res.text();
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
