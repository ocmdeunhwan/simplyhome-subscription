import { NextResponse } from "next/server";
import { allPosts, listView } from "@/lib/posts";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const items = await allPosts();

  const id = url.searchParams.get("id");
  if (id) {
    const item = items.find((i) => i.id === id);
    if (!item) return NextResponse.json({ error: "없는 글입니다." }, { status: 404 });
    return NextResponse.json({ item });
  }

  if (url.searchParams.get("counts")) {
    return NextResponse.json({ counts: { simplyhome: items.length } });
  }

  return NextResponse.json({ items: items.map(listView) });
}
