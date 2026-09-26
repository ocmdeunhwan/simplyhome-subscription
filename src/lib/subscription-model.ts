// Client-safe types for the 구독 (subscription) feature: auto-collected
// Instagram posts from a followed account (e.g. @mosseri), stored with the
// original English text AND a paragraph-aligned Korean translation so the
// exact wording is preserved for quoting later.

// One paragraph in both languages — the unit of the immersive-translate reader.
export interface BilingualBlock {
  en: string;
  ko: string;
}

// A bilingual text body (caption or transcript).
export interface BilingualText {
  en: string; // full original (untouched)
  ko: string; // full translation (blocks joined)
  blocks: BilingualBlock[];
}

// 벤치마킹 픽 — 이 게시물이 통한 원인이 우리 계정(@eunhwan_kr)에 이식 가능하다고
// 판단해 "꼭 봐" 표시를 한 것. 필드가 존재하면 픽이다.
// criteria 축: "메시지"(통찰이 매력적) / "방법론"(시의성 있고 구체적) /
// "교감"(청중과 소통하는 방식이 세련되고 따라할 수 있음).
export interface BenchmarkNote {
  criteria: string[];
  hook?: string; // 썸네일에 박히는 "왜 봐야 하는지" 한 줄 (공백 포함 28자 이내)
  why: string; // 왜 통했나 (반응 근거 포함)
  how: string; // 내 계정에 어떻게 접목하나 (구체 지시)
  // 우리도 꼭 해 봤으면 하는 부분 하나 — how 보다 좁게, 영상 속 한 장면·한 장치.
  tryThis?: string;
  // 오콘목달에서 따라 했을 때 가장 크게 날 것 같은 효과 하나와 그 이유.
  effect?: BenchmarkEffect;
  effectWhy?: string;
}

// 유입 = 처음 보는 사람이 들어옴 · 신뢰 = 이 사람 말을 믿게 됨 ·
// 전환 = 신청·구매로 이어짐 · 흥미 = 끝까지 보고 저장·공유함.
export const BENCHMARK_EFFECTS = ["유입", "신뢰", "전환", "흥미"] as const;
export type BenchmarkEffect = (typeof BENCHMARK_EFFECTS)[number];

// 인스타 인사이트 — Apify가 게시물마다 돌려주는 공개 수치를 그대로 담는다.
// 저장 수·프로필 방문처럼 계정 주인만 보는 값은 공개 API에 없어서 비워 둔다.
export interface PostInsights {
  views?: number; // 조회수(영상 재생 수)
  likes?: number;
  comments?: number;
  durationSec?: number; // 영상 길이
  hashtags?: string[];
  mentions?: string[];
  taggedUsers?: string[];
  musicTitle?: string; // 사용한 음원
  isSponsored?: boolean;
  slideCount?: number; // 여러 장 글이면 장 수
  // 수집 시점 기준 값 — 나중에 다시 재면 팔로워가 달라지므로 같이 적는다.
  followersAtScrape?: number;
  engagementRate?: number; // (좋아요+댓글) / 팔로워, %
}

// 반응이 튄 글. 같은 계정 안에서 중앙값의 몇 배였는지로 판단한다.
// 팔로워 급상승은 인스타가 게시물 단위로 공개하지 않아서, 조회수·좋아요·댓글이
// 동시에 튄 글을 "팔로워를 데려온 글"로 본다(kinds 에 세 축이 모두 들어간 경우).
export interface SpikeMark {
  kinds: ("likes" | "views" | "comments")[];
  likesX?: number; // 좋아요 중앙값 대비 배수
  viewsX?: number;
  commentsX?: number;
}

// 댓글 한 줄. id(작성자 계정)를 반드시 남긴다 — 누가 가장 많이 반응하는지
// 순위를 매기는 근거가 이 필드다.
export interface PostComment {
  id: string; // 댓글 고유 id
  username: string; // 댓글 단 사람의 인스타 아이디
  text: string;
  likes?: number;
  date?: string; // YYYY-MM-DD
  replyToId?: string; // 대댓글이면 부모 댓글 id
  isOwner?: boolean; // 계정 주인이 단 답글인지
}

export interface SubscriptionItem {
  id: string; // native platform id (IG shortcode / YouTube video id) — used for dedup
  url: string; // post / video URL
  username: string; // e.g. "mosseri" (channel/author handle)
  authorName?: string; // e.g. "Adam Mosseri"
  thumbnail?: string; // media image (kept, not shown on the cover)
  postType?: string; // Image | Video | Sidecar ...

  // Which subscription this belongs to — the registry id in subscriptions.ts
  // (e.g. "mosseri", "lee-chansu", "shin"). Drives the person tab grouping.
  // Items predating multi-source default to "mosseri" (see subscription.ts).
  source?: string;

  // Cover (white variant)
  eyebrow: string; // category / topic label (Korean)
  title: string; // headline (Korean). IG: AI-written. YouTube: original video title (kept verbatim).
  date: string; // post/upload date YYYY-MM-DD (cover date)

  // Lecture number within a curated course (제품론 1강, 2강 …). When set, the
  // category view orders by it instead of by date. Omitted for normal items.
  seq?: number;

  // Korean-native sources (sermons/lectures) get an AI 핵심 요약 shown above the
  // transcript. English sources (Mosseri) don't use this — the bilingual reader
  // is the value there.
  summary?: string;

  // Preserved content. For English sources both en+ko are filled (bilingual
  // reader). For Korean-native sources the original is Korean, so `caption` is
  // empty and `transcript` holds the Korean text with en left blank — the reader
  // renders ko-only when en is absent.
  caption: BilingualText;
  transcript?: BilingualText; // spoken script / captions, when available
  transcriptTried?: boolean; // backfill attempted (image posts have no audio)

  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number; // 영상 조회수 (이미지 글은 없음)

  // 인사이트 지표 묶음 + 반응이 튄 글 표시 + 댓글 원문 전체.
  // comments 는 무거워서 목록 조회에서는 빼고 상세에서만 읽는다.
  insights?: PostInsights;
  spike?: SpikeMark;
  comments?: PostComment[];

  // "이건 꼭 봐" — 벤치마킹 픽과 그 의견. 카드 배지·상세 박스·옵시디언
  // 벤치마킹 섹션이 이 필드 하나로 켜진다.
  benchmark?: BenchmarkNote;

  saved: string; // when we ingested it (YYYY-MM-DD)
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// The account this subscription tracks. Single account for now; the sync
// endpoint reads this. Change here to follow a different person.
export const SUBSCRIPTION_ACCOUNT = {
  username: "mosseri",
  profileUrl: "https://www.instagram.com/mosseri/",
  authorName: "Adam Mosseri",
};

// Posts on/after this date get a transcript generated automatically (on sync
// and via backfill). Older posts can still be transcribed manually. YYYY-MM-DD
// string compare is correct for ISO date keys.
export const TRANSCRIBE_SINCE = "2026-01-01";

export function shouldTranscribe(dateKey: string): boolean {
  return (dateKey || "") >= TRANSCRIBE_SINCE;
}
