// Code-rendered cover thumbnail, 1:1 from the Figma frames
// (cdSKu5zxNrU0jFgyBG1r9J). Two variants:
//   - "live"  : node 40000181:124 — periwinkle bg, white text, OCMD live
//               special with avatar + gradient ring + LIVE badge. Used by 수집.
//   - "white" : node 40000181:202 — white bg, black text, no avatar/LIVE.
//               Used by 구독 (Mosseri subscription).
//
// Only text is injected (eyebrow / title / date); brand chrome is fixed.
//
// Scaling: the wrapper is a CSS container (`container-type: inline-size`) locked
// to 16:9, and every size/offset is expressed in `cqw` (1cqw = 1% of the
// wrapper width = 16px at the native 1600px), so the design scales
// pixel-faithfully to any width with no layout drift.

import type { CSSProperties } from "react";
type Resource = { title: string; eyebrow: string; what: string; why: string; url: string };

const FONT =
  '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", sans-serif';

// Figma px → cqw (factor 100/1600 = 0.0625).
const cq = (px: number) => `${px * 0.0625}cqw`;

// Avatar in the bottom-right circle (live variant only). Default is the OCMD
// host; specific people get their own photo. Adam Mosseri always uses his.
const DEFAULT_AVATAR = "/collection-cover/avatar.png";
const MOSSERI_AVATAR = "/collection-cover/avatar-mosseri.png";

// Pick the cover avatar from a resource's text. Extend this map as more people
// get dedicated photos (drop the file in /public/collection-cover and add a rule).
export function coverAvatarFor(
  r: Partial<Pick<Resource, "title" | "eyebrow" | "what" | "why" | "url">> & {
    topic?: string[];
  }
): string {
  const hay = [
    r.title,
    r.eyebrow,
    r.what,
    r.why,
    r.url,
    (r.topic ?? []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (hay.includes("mosseri") || hay.includes("모세리")) return MOSSERI_AVATAR;
  return DEFAULT_AVATAR;
}

export type CoverVariant = "live" | "white";

// Per-variant design tokens, straight from the two Figma frames.
const VARIANTS = {
  live: {
    bg: "#7183f1",
    fg: "#ffffff",
    logo: "/collection-cover/logo.svg",
    chrome: true, // avatar + ring + LIVE badge
    eyebrowTop: 173,
    titleTop: 312,
    titleSize: 140,
    titleTracking: -2.8,
  },
  white: {
    bg: "#ffffff",
    fg: "#0a0a0a",
    logo: "/collection-cover/logo-black.svg",
    chrome: false,
    eyebrowTop: 215,
    titleTop: 360,
    titleSize: 150,
    titleTracking: -3,
  },
} as const;

export interface CollectionCoverProps {
  eyebrow?: string;
  title?: string;
  date?: string;
  avatar?: string;
  variant?: CoverVariant;
  className?: string;
  // 벤치마킹 픽("이건 꼭 봐")의 한 줄 이유. 있으면 커버 하단에 초록 띠로
  // "꼭 봐 · <이유>"를 그리고, 자리가 겹치는 날짜 블록은 숨긴다 (날짜는 카드
  // 푸터·상세에 이미 있음).
  benchmarkHook?: string;
}

export function CollectionCover({
  eyebrow,
  title,
  date,
  avatar,
  variant = "live",
  className,
  benchmarkHook,
}: CollectionCoverProps) {
  const v = VARIANTS[variant];
  return (
    <div
      className={className}
      style={{
        containerType: "inline-size",
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        background: v.bg,
        overflow: "hidden",
        fontFamily: FONT,
        color: v.fg,
      }}
    >
      {/* eyebrow — Pretendard Regular 70px */}
      {eyebrow ? (
        <p
          style={{
            position: "absolute",
            top: cq(v.eyebrowTop),
            left: "50%",
            transform: "translateX(-50%)",
            margin: 0,
            width: "92%",
            textAlign: "center",
            fontWeight: 400,
            fontSize: cq(70),
            lineHeight: 1.2,
            letterSpacing: cq(-1.4),
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {eyebrow}
        </p>
      ) : null}

      {/* title — Pretendard ExtraBold, up to 2 lines */}
      {title ? (
        <h3
          style={
            {
              position: "absolute",
              top: cq(v.titleTop),
              left: "50%",
              transform: "translateX(-50%)",
              margin: 0,
              width: "90%",
              textAlign: "center",
              fontWeight: 800,
              fontSize: cq(v.titleSize),
              lineHeight: 1.1,
              letterSpacing: cq(v.titleTracking),
              textWrap: "balance",
              wordBreak: "keep-all", // 한글은 공백에서만 줄바꿈 (단어 중간 분리 방지)
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            } as CSSProperties
          }
        >
          {title}
        </h3>
      ) : null}

      {/* 벤치마킹 띠 — 하단 전폭. "꼭 봐" 라벨 + 왜 봐야 하는지 한 줄. */}
      {benchmarkHook ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: cq(150),
            background: "#059669",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: cq(24),
            padding: `0 ${cq(48)}`,
          }}
        >
          <span
            style={{
              flexShrink: 0,
              fontWeight: 800,
              fontSize: cq(44),
              lineHeight: 1,
              letterSpacing: cq(-0.9),
              padding: `${cq(12)} ${cq(22)}`,
              border: `${cq(4)} solid rgba(255,255,255,0.85)`,
              borderRadius: cq(999),
            }}
          >
            꼭 봐
          </span>
          <span
            style={{
              minWidth: 0,
              fontWeight: 600,
              fontSize: cq(52),
              lineHeight: 1.2,
              letterSpacing: cq(-1),
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {benchmarkHook}
          </span>
        </div>
      ) : null}

      {/* date — hairline + Pretendard Regular 50px, block centre at 801px.
          벤치마킹 띠가 있으면 겹치므로 숨긴다. */}
      {date && !benchmarkHook ? (
        <div
          style={{
            position: "absolute",
            top: cq(748),
            left: "50%",
            transform: "translateX(-50%)",
            paddingTop: cq(20),
            borderTop: `${cq(4)} solid ${v.fg}`,
          }}
        >
          <p
            style={{
              margin: 0,
              textAlign: "center",
              fontWeight: 400,
              fontSize: cq(50),
              lineHeight: 1.2,
              letterSpacing: cq(-1),
              whiteSpace: "nowrap",
            }}
          >
            {date}
          </p>
        </div>
      ) : null}

      {/* OCMD logo — fixed, top-right (inset 7.89% / 5% / 85.26% / 83.38%).
          Wrapped in a div so the four insets size the box; a bare <img> is a
          replaced element and would ignore right/bottom and use its natural size. */}
      <div
        style={{
          position: "absolute",
          top: "7.89%",
          left: "83.38%",
          right: "5%",
          bottom: "85.26%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={v.logo}
          alt="OCMD"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Brand chrome — live variant only: avatar + gradient ring + LIVE badge */}
      {v.chrome ? (
        <>
          {/* avatar — bottom-right circle (inset 68.11% / 4% / 6.33% / 81.63%) */}
          <div
            style={{
              position: "absolute",
              top: "68.11%",
              left: "81.63%",
              right: "4%",
              bottom: "6.33%",
              borderRadius: "9999px",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar ?? DEFAULT_AVATAR}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* gradient ring (inset 66.67% / 3.25% / 4.99% / 80.81%) */}
          <div
            style={{
              position: "absolute",
              top: "66.67%",
              left: "80.81%",
              right: "3.25%",
              bottom: "4.99%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/collection-cover/ring.svg"
              alt=""
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          {/* LIVE badge background (inset 91.78% / 7.64% / 3.49% / 85.25%) */}
          <div
            style={{
              position: "absolute",
              top: "91.78%",
              left: "85.25%",
              right: "7.64%",
              bottom: "3.49%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/collection-cover/live.svg"
              alt=""
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          {/* LIVE label */}
          <span
            style={{
              position: "absolute",
              top: "91.89%",
              left: "86.63%",
              right: "9.03%",
              bottom: "3.64%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 400,
              fontSize: cq(33),
              lineHeight: 1,
              color: "#ffffff",
            }}
          >
            LIVE
          </span>
        </>
      ) : null}
    </div>
  );
}
