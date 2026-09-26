import { promises as fs } from "node:fs";
import path from "node:path";
import type { SubscriptionItem } from "@/lib/subscription-model";

// 글 750개는 data/posts.json 한 파일에 있다. 원래 대시보드의 Supabase 표에서
// 심플리홈 행만 모든 칸 그대로 꺼낸 것이다 (2026-09-26).
let cache: SubscriptionItem[] | null = null;

export async function allPosts(): Promise<SubscriptionItem[]> {
  if (!cache) {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "posts.json"), "utf-8");
    cache = (JSON.parse(raw) as SubscriptionItem[]).map((it) => ({
      ...it,
      // 인스타 그림 주소는 몇 주 지나면 막힌다. 내려받아 둔 그림을 쓴다.
      thumbnail: `/thumbnails/${it.id}.jpg`,
    }));
  }
  return cache;
}

// 목록에서는 무거운 대본·댓글을 빼고 보낸다. 글을 열면 한 건을 통째로 다시 읽는다.
export function listView(it: SubscriptionItem): SubscriptionItem {
  const { transcript: _t, comments: _c, ...rest } = it;
  return rest;
}
