"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  XMarkIcon,
  TrashIcon,
  LinkIcon,
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  LanguageIcon,
  DocumentTextIcon,
  SparklesIcon,
  BookmarkIcon,
  EyeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/16/solid";
import { CollectionCover } from "@/components/collection-cover";
import { formatKoreanDate } from "@/lib/date";
import {
  hostnameOf,
  type BilingualText,
  type PostComment,
  type PostInsights,
  type SpikeMark,
  type SubscriptionItem,
} from "@/lib/subscription-model";
import {
  SUBSCRIPTIONS,
  DEFAULT_SOURCE,
  subscriptionById,
} from "@/lib/subscriptions";

type ReadMode = "both" | "ko" | "en";
type SubscriptionSort = "latest" | "popular" | "views";

interface SubscriptionWorkspaceProps {
  embedded?: boolean;
}

const sourceOf = (it: SubscriptionItem) => it.source || DEFAULT_SOURCE;

const nf = (n: number) => n.toLocaleString("ko-KR");

// 반응이 튄 축 이름 — 배지에 그대로 찍힌다.
const SPIKE_NAMES: Record<"views" | "likes" | "comments", string> = {
  views: "조회",
  likes: "좋아요",
  comments: "댓글",
};

// 튄 축을 배수가 큰 순으로 늘어놓는다. 첫 번째가 가장 크게 튄 축.
function spikeMarks(spike: SpikeMark) {
  const times: Record<"views" | "likes" | "comments", number | undefined> = {
    views: spike.viewsX,
    likes: spike.likesX,
    comments: spike.commentsX,
  };
  return spike.kinds
    .map((k) => ({ kind: k, name: SPIKE_NAMES[k], times: times[k] }))
    .sort((a, b) => (b.times ?? 0) - (a.times ?? 0));
}

// "조회 9배". 배수를 모르면 축 이름만 쓴다.
function spikeText(m: { name: string; times?: number }) {
  return m.times ? `${m.name} ${Math.round(m.times)}배` : m.name;
}

// 45 → "0:45"
function durationText(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

export function SubscriptionWorkspace({ embedded = false }: SubscriptionWorkspaceProps) {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [source, setSource] = useState<string>(SUBSCRIPTIONS[0]?.id ?? DEFAULT_SOURCE);
  const [category, setCategory] = useState<string>("전체");
  const [benchmarkOnly, setBenchmarkOnly] = useState(false);
  const [spikeOnly, setSpikeOnly] = useState(false);
  const [sort, setSort] = useState<SubscriptionSort>("latest");
  const [selected, setSelected] = useState<SubscriptionItem | null>(null);

  const sub = subscriptionById(source);

  // 계정 하나씩 읽는다. 표 전체를 한 번에 읽으면 시간 초과로 목록이 비어
  // "0개" 가 떴다 (2026-09-24). 한 번 읽은 계정은 기억해 두고 칩을 오갈 때
  // 바로 보여 준 뒤 뒤에서 새로 받는다.
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const cache = useRef(new Map<string, SubscriptionItem[]>());
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const loadCounts = () => {
    fetch("/api/subscription?counts=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.counts) setCounts(new Map(Object.entries(d.counts as Record<string, number>)));
      })
      .catch(() => {});
  };

  const loadSource = (id: string) => {
    const cached = cache.current.get(id);
    setItems(cached ?? []);
    setLoading(!cached);
    setLoadError(null);
    fetch(`/api/subscription?source=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "목록을 읽지 못했어요.");
        return d;
      })
      .then((d) => {
        const list = (d.items ?? []) as SubscriptionItem[];
        cache.current.set(id, list);
        setCounts((prev) => new Map(prev).set(id, list.length));
        if (sourceRef.current === id) setItems(list);
      })
      .catch((e) => {
        if (sourceRef.current === id && !cached) {
          setLoadError(e instanceof Error ? e.message : "목록을 읽지 못했어요.");
        }
      })
      .finally(() => {
        if (sourceRef.current === id) setLoading(false);
      });
  };

  const load = () => {
    cache.current.clear();
    loadCounts();
    loadSource(sourceRef.current);
  };

  useEffect(() => {
    loadSource(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => {
    loadCounts();
  }, []);

  const itemsForSource = useMemo(
    () => items.filter((it) => sourceOf(it) === source),
    [items, source]
  );

  const isSequenced = useMemo(
    () => itemsForSource.some((item) => typeof item.seq === "number"),
    [itemsForSource]
  );

  // Category chips only where the subscription opts in (Mosseri). Others stack
  // chronologically with no chips.
  const categories = useMemo(() => {
    if (!sub?.showCategoryChips) return [];
    const c = new Map<string, number>();
    for (const it of itemsForSource)
      c.set(it.eyebrow || "기타", (c.get(it.eyebrow || "기타") ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [itemsForSource, sub]);

  // 벤치마킹 픽("꼭 봐") 개수 — 있을 때만 필터 칩을 보여준다.
  const benchmarkCount = useMemo(
    () => itemsForSource.filter((it) => it.benchmark).length,
    [itemsForSource]
  );

  // 반응이 튄 글 개수 — 표시가 붙은 사람 탭에서만 필터 칩을 보여준다.
  const spikeCount = useMemo(
    () => itemsForSource.filter((it) => it.spike).length,
    [itemsForSource]
  );

  // 조회수가 하나라도 있어야 조회수순 버튼을 낸다(유튜브·모세리 탭은 그대로).
  const hasViews = useMemo(
    () => itemsForSource.some((it) => typeof it.viewsCount === "number"),
    [itemsForSource]
  );

  const mustWatch = useMemo(
    () =>
      itemsForSource
        .filter((item) => item.benchmark)
        .sort(
          (a, b) =>
            (b.likesCount ?? 0) + (b.commentsCount ?? 0) * 4 -
            ((a.likesCount ?? 0) + (a.commentsCount ?? 0) * 4)
        )
        .slice(0, 3),
    [itemsForSource]
  );

  const mustWatchIds = useMemo(
    () => new Set(mustWatch.map((item) => item.id)),
    [mustWatch]
  );

  const filtered = useMemo(() => {
    let base =
      sub?.showCategoryChips && category !== "전체"
        ? itemsForSource.filter((it) => (it.eyebrow || "기타") === category)
        : itemsForSource;
    if (benchmarkOnly) base = base.filter((it) => it.benchmark);
    if (spikeOnly) base = base.filter((it) => it.spike);
    // A curated course (items carry a lecture number) reads in 강 order;
    // everything else stays newest-first as returned by the API.
    if (base.some((it) => typeof it.seq === "number")) {
      return [...base].sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity));
    }
    if (sort === "views") {
      return [...base].sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0));
    }
    if (sort === "popular") {
      return [...base].sort(
        (a, b) =>
          (b.likesCount ?? 0) + (b.commentsCount ?? 0) * 4 -
          ((a.likesCount ?? 0) + (a.commentsCount ?? 0) * 4)
      );
    }
    return [...base].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [itemsForSource, category, sub, benchmarkOnly, spikeOnly, sort]);

  // 필터를 켜면 "지금 먼저 볼 자료" 묶음을 접으므로, 그 글도 목록에 그대로 남긴다.
  const regularItems = useMemo(
    () =>
      benchmarkOnly || spikeOnly
        ? filtered
        : filtered.filter((item) => !mustWatchIds.has(item.id)),
    [benchmarkOnly, spikeOnly, filtered, mustWatchIds]
  );

  return (
    <div className={embedded ? "min-h-0" : "flex h-full flex-col"}>
      <header
        className={
          embedded
            ? "pb-6 shadow-[0_1px_0_0_rgba(10,10,10,0.05)]"
            : "px-4 pb-6 pt-8 shadow-[0_1px_0_0_rgba(10,10,10,0.05)] sm:px-8 sm:pt-10"
        }
      >
        <div className="flex items-start justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="min-w-0">
            <p className="eyebrow">Subscription</p>
            <h1 className="mt-2 text-2xl text-display leading-[1.15] text-balance sm:text-4xl sm:leading-[1.1]">
              <span className="text-neutral-950">구독{embedded ? "" : "."}</span>
            </h1>
            {embedded && (
              <p className="mt-2 text-sm text-neutral-500">
                내가 고른 사람과 채널의 새 자료를 한곳에서 읽고 정리합니다.
              </p>
            )}
          </div>
          <a
            href="https://www.instagram.com/__simplyhome/"
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 h-[38px] px-5 rounded-full bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800 transition"
          >
            <LinkIcon className="w-4 h-4" />
            인스타그램
          </a>
        </div>

        {syncMsg && (
          <p className="mb-4 text-xs text-neutral-500 inline-flex items-center gap-1.5">
            {syncing && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
            {syncMsg}
          </p>
        )}

        {/* Person tabs — the primary grouping axis. 두 줄: 읽는 계정 / 봐주는
            계정. 줄은 role 로, 주제는 칩 옆 꼬리표로. 봐주는 계정은 마지막으로
            봐준 날을 같이 보여 준다 — 얼마나 방치했는지가 곧 할 일이라서. */}
        <div className="flex flex-col gap-2">
          {(
            [
              { role: "read", label: "읽는 계정" },
              { role: "coach", label: "봐주는 계정" },
            ] as const
          ).map((row) => {
            const subs = SUBSCRIPTIONS.filter((s) => s.role === row.role);
            if (subs.length === 0) return null;
            return (
              <div key={row.role} className="flex items-center gap-1.5 flex-wrap">
                <span className="eyebrow w-16 shrink-0">{row.label}</span>
                {subs.map((s) => {
                  const active = source === s.id;
                  const tail =
                    s.role === "coach"
                      ? s.coachedAt
                        ? s.coachedAt.slice(5).replace(/^0/, "").replace("-0", "/").replace("-", "/")
                        : "아직"
                      : s.topic;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSource(s.id);
                        setCategory("전체");
                        setBenchmarkOnly(false);
                        setSpikeOnly(false);
                        setSort("latest");
                      }}
                      className={`inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-full transition ${
                        active
                          ? "bg-neutral-950 text-white"
                          : "bg-white text-neutral-700 ring-1 ring-neutral-950/5 hover:ring-neutral-950/10"
                      }`}
                    >
                      {s.name}
                      <span
                        className={`text-[10px] font-normal ${
                          active ? "opacity-70" : "text-neutral-400"
                        }`}
                      >
                        · {tail}
                      </span>
                      <span
                        className={`text-[10px] font-normal tnum ${
                          active ? "opacity-70" : "text-neutral-400"
                        }`}
                      >
                        {counts.get(s.id) ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 벤치마킹 픽 · 반응이 튄 글 필터 — 해당하는 글이 있는 탭에서만 노출. */}
        {(benchmarkCount > 0 || spikeCount > 0) && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {benchmarkCount > 0 && (
              <button
                onClick={() => {
                  setBenchmarkOnly((v) => !v);
                  setSpikeOnly(false);
                }}
                className={`inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-full transition ${
                  benchmarkOnly
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-emerald-700 ring-1 ring-emerald-600/20 hover:ring-emerald-600/40"
                }`}
              >
                <BookmarkIcon className="w-3.5 h-3.5" />
                꼭 봐 (벤치마킹)
                <span
                  className={`text-[10px] font-normal tnum ${
                    benchmarkOnly ? "opacity-70" : "text-emerald-600/70"
                  }`}
                >
                  {benchmarkCount}
                </span>
              </button>
            )}
            {spikeCount > 0 && (
              <button
                onClick={() => {
                  setSpikeOnly((v) => !v);
                  setBenchmarkOnly(false);
                }}
                className={`inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-full transition ${
                  spikeOnly
                    ? "bg-amber-600 text-white"
                    : "bg-white text-amber-700 ring-1 ring-amber-600/20 hover:ring-amber-600/40"
                }`}
              >
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                반응이 튄 글
                <span
                  className={`text-[10px] font-normal tnum ${
                    spikeOnly ? "opacity-70" : "text-amber-600/70"
                  }`}
                >
                  {spikeCount}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Category chips — Mosseri only. */}
        {sub?.showCategoryChips && categories.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {(["전체", ...categories.map(([c]) => c)] as string[]).map((c) => {
              const active = category === c;
              const count =
                c === "전체"
                  ? itemsForSource.length
                  : categories.find(([x]) => x === c)?.[1] ?? 0;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-full transition ${
                    active
                      ? "bg-neutral-800 text-white"
                      : "bg-white text-neutral-700 ring-1 ring-neutral-950/5 hover:ring-neutral-950/10"
                  }`}
                >
                  {c}
                  <span
                    className={`text-[10px] font-normal tnum ${
                      active ? "opacity-70" : "text-neutral-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main
        className={
          embedded
            ? "pt-6"
            : "flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8"
        }
      >
        {!loading && !benchmarkOnly && !spikeOnly && mustWatch.length > 0 && (
          <section className="mb-8 rounded-2xl bg-neutral-950 p-4 text-white sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  꼭 보세요 · 최대 3개
                </p>
                <h2 className="mt-1 text-base font-medium">지금 먼저 볼 자료</h2>
              </div>
              <span className="text-[11px] text-neutral-400">벤치마킹 추천순</span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {mustWatch.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="rounded-xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  <p className="text-[10px] font-semibold text-emerald-300">
                    {item.eyebrow || sub?.name || "구독"}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-5">
                    {item.title || "(제목 없음)"}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">
                    {item.benchmark?.why || item.summary || item.caption?.ko}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              {benchmarkOnly
                ? "꼭 봐 자료"
                : spikeOnly
                  ? "반응이 튄 글"
                  : "모든 새 자료"}
            </h2>
            <span className="mt-1 block text-xs text-neutral-500">
              {loading
                ? "불러오는 중..."
                : `${regularItems.length}개 / ${sub?.name ?? ""} ${itemsForSource.length}개`}
            </span>
          </div>
          {!benchmarkOnly && !isSequenced && (
            <div className="inline-flex rounded-xl bg-neutral-950/[0.04] p-1 text-xs">
              <button
                type="button"
                onClick={() => setSort("latest")}
                className={`rounded-lg px-3 py-2 ${
                  sort === "latest" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400"
                }`}
              >
                최신순
              </button>
              <button
                type="button"
                onClick={() => setSort("popular")}
                className={`rounded-lg px-3 py-2 ${
                  sort === "popular" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400"
                }`}
              >
                인기순
              </button>
              {hasViews && (
                <button
                  type="button"
                  onClick={() => setSort("views")}
                  className={`rounded-lg px-3 py-2 ${
                    sort === "views" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400"
                  }`}
                >
                  조회수순
                </button>
              )}
            </div>
          )}
        </div>

        {!loading && loadError && itemsForSource.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-neutral-500 mb-4">
              <b>{sub?.name}</b> 목록을 읽지 못했어요. 저장된 자료는 그대로 있어요.
            </p>
            <button
              onClick={() => loadSource(source)}
              className="inline-flex items-center gap-1.5 h-9 px-5 text-xs font-medium rounded-full bg-neutral-950 text-white hover:bg-neutral-800 transition"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              다시 읽기
            </button>
          </div>
        )}

        {!loading && !loadError && itemsForSource.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-neutral-400 mb-4">
              아직 <b>{sub?.name}</b> 항목이 없어요. 
            </p>

          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {regularItems.map((it) => (
            <SubCard key={it.id} item={it} onClick={() => setSelected(it)} />
          ))}
        </div>
      </main>

      {selected && (
        <DetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={(u) => {
            setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)));
            setSelected(u);
          }}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SubCard({
  item,
  onClick,
}: {
  item: SubscriptionItem;
  onClick: () => void;
}) {
  const platform = subscriptionById(item.source)?.platform ?? "instagram";
  const isYouTube = platform === "youtube";
  // 튄 축은 가장 크게 튄 것 하나만 배지로 쓴다. 나머지는 "+1" 로 귀띔.
  const spikes = item.spike ? spikeMarks(item.spike) : [];
  const topSpike = spikes[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col p-5 rounded-2xl bg-white transition text-left min-h-[200px] ring-1 ring-neutral-950/5 hover:ring-neutral-950/10"
    >
      <div className="mb-4 overflow-hidden rounded-xl ring-1 ring-neutral-950/5">
        <CollectionCover
          variant="white"
          eyebrow={item.eyebrow}
          title={item.title}
          date={formatKoreanDate(item.date)}
          benchmarkHook={item.benchmark?.hook}
        />
      </div>

      {/* 배지는 카드마다 하나만 — 꼭 봐가 있으면 그게 이기고, 튄 표시는 아래 줄로. */}
      <div className="flex items-center gap-2 mb-2">
        <span className="eyebrow text-neutral-500">{item.eyebrow || "기타"}</span>
        {item.benchmark ? (
          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-emerald-600/10 text-emerald-700 text-[10px] font-semibold">
            <BookmarkIcon className="w-2.5 h-2.5" />
            꼭 봐
          </span>
        ) : (
          topSpike && (
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-semibold">
              <ArrowTrendingUpIcon className="w-2.5 h-2.5" />
              {spikeText(topSpike)}
              {spikes.length > 1 && (
                <span className="font-normal text-amber-700/70">
                  +{spikes.length - 1}
                </span>
              )}
            </span>
          )
        )}
      </div>

      <h3 className="text-base font-medium text-neutral-950 leading-snug line-clamp-2 tracking-tight">
        {item.title || "(제목 없음)"}
      </h3>

      {/* Preview: Mosseri shows the Korean caption; YouTube shows the 핵심 요약. */}
      {(isYouTube ? item.summary : item.caption?.ko) && (
        <p className="text-sm text-neutral-500 leading-[1.45] line-clamp-2 mt-2">
          {isYouTube ? item.summary : item.caption?.ko}
        </p>
      )}

      <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400 shadow-[0_-1px_0_0_rgba(10,10,10,0.05)]">
        <span className="truncate">{isYouTube ? item.username : `@${item.username}`}</span>
        <span>·</span>
        <span className="tnum">{item.date}</span>
        {typeof item.likesCount === "number" && (
          <span className="inline-flex items-center gap-0.5 tnum" title="좋아요">
            <HeartIcon className="w-3 h-3" />
            {nf(item.likesCount)}
          </span>
        )}
        {typeof item.viewsCount === "number" && (
          <span className="inline-flex items-center gap-0.5 tnum" title="조회수">
            <EyeIcon className="w-3 h-3" />
            {nf(item.viewsCount)}
          </span>
        )}
        {typeof item.commentsCount === "number" && (
          <span className="inline-flex items-center gap-0.5 tnum" title="댓글 수">
            <ChatBubbleOvalLeftIcon className="w-3 h-3" />
            {nf(item.commentsCount)}
          </span>
        )}
        {/* 꼭 봐 배지에 자리를 내준 경우 — 색은 쓰지 않고 여기서 조용히 알린다. */}
        {item.benchmark && topSpike && (
          <span className="inline-flex items-center gap-0.5 text-neutral-500">
            <ArrowTrendingUpIcon className="w-3 h-3" />
            {spikeText(topSpike)}
          </span>
        )}
      </div>
    </button>
  );
}

function DetailModal({
  item,
  onClose,
  onUpdated,
  onDeleted,
}: {
  item: SubscriptionItem;
  onClose: () => void;
  onUpdated: (item: SubscriptionItem) => void;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<ReadMode>("both");
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const platform = subscriptionById(item.source)?.platform ?? "instagram";
  const isYouTube = platform === "youtube";
  // 영어 유튜브(Mark Tilbury)는 자막을 한국어로 옮겨 두었다 — 인스타 영어
  // 계정처럼 원문+번역 보기 단추를 띄운다.
  const bilingual = !isYouTube || subscriptionById(item.source)?.lang === "en";
  // 사진 한 장 / 여러 장 글에는 소리가 없다 — 대본 만들기를 권하지 않는다.
  const isPhotoPost = /image|sidecar|carousel/i.test(item.postType ?? "");

  // The list omits the heavy transcript (keeps the query light); fetch the full
  // item by id when the modal opens.
  const [fetched, setFetched] = useState<SubscriptionItem | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/subscription?id=${encodeURIComponent(item.id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.item) setFetched(d.item);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [item.id]);

  const transcript = fetched?.transcript ?? item.transcript;
  const hasTranscript = !!transcript && transcript.blocks.length > 0;

  // 지표·댓글 원문은 목록 조회에 없다. 전체 행을 받아온 뒤에 채워진다.
  const insights = fetched?.insights ?? item.insights;
  const comments = fetched?.comments ?? item.comments ?? [];
  const viewsCount = fetched?.viewsCount ?? item.viewsCount;

  const runTranscribe = async () => {
    setTranscribing(true);
    setTxError(null);
    try {
      const res = await fetch("/api/subscription/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "전사 실패");
      if (d.item) {
        setFetched(d.item);
        onUpdated(d.item);
      }
    } catch (e) {
      setTxError(e instanceof Error ? e.message : "전사 실패");
    } finally {
      setTranscribing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 항목을 구독에서 삭제할까요?")) return;
    setBusy(true);
    try {
      await fetch(`/api/subscription?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  const host = hostnameOf(item.url);

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/40 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl ring-1 ring-neutral-950/5 w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 shadow-[0_1px_0_0_rgba(10,10,10,0.05)]">
          <div className="min-w-0">
            <p className="eyebrow">{item.eyebrow || "구독"}</p>
            <h2 className="text-base text-heading text-neutral-950 truncate">
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-1.5 inline-flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-950/5 transition shrink-0"
            aria-label="닫기"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <CollectionCover
            variant="white"
            eyebrow={item.eyebrow}
            title={item.title}
            date={formatKoreanDate(item.date)}
            benchmarkHook={item.benchmark?.hook}
            className="rounded-xl ring-1 ring-neutral-950/5"
          />

          {/* 인스타에 올라간 실제 첫 장. 받아 둔 그림(public/thumbnails)이 없으면 감춘다. */}
          {item.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              onError={(e) => (e.currentTarget.style.display = "none")}
              className="w-full rounded-xl ring-1 ring-neutral-950/5"
            />
          )}

          {/* source meta */}
          <div className="grid gap-2 rounded-xl bg-neutral-950/[0.02] p-4 text-sm ring-1 ring-neutral-950/5">
            <Row label={isYouTube ? "채널" : "작성자"}>
              {isYouTube
                ? item.username
                : `${item.authorName || ""} (@${item.username})`}
            </Row>
            <Row label={isYouTube ? "업로드" : "게시일"}>
              <span className="tnum">{formatKoreanDate(item.date)}</span>
            </Row>
            {(typeof item.likesCount === "number" ||
              typeof item.commentsCount === "number") && (
              <Row label="반응">
                <span className="inline-flex items-center gap-3 text-neutral-600">
                  {typeof item.likesCount === "number" && (
                    <span className="inline-flex items-center gap-1 tnum">
                      <HeartIcon className="w-3.5 h-3.5" />
                      {item.likesCount.toLocaleString()}
                    </span>
                  )}
                  {typeof item.commentsCount === "number" && (
                    <span className="inline-flex items-center gap-1 tnum">
                      <ChatBubbleOvalLeftIcon className="w-3.5 h-3.5" />
                      {item.commentsCount.toLocaleString()}
                    </span>
                  )}
                </span>
              </Row>
            )}
            <Row label="원문">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline break-all"
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                {host || item.url}
              </a>
            </Row>
          </div>

          {/* 벤치마킹 의견 — "이건 꼭 봐" 픽에만 붙는다. */}
          {item.benchmark && (
            <div className="rounded-xl bg-emerald-600/[0.06] ring-1 ring-emerald-600/15 p-4">
              <p className="eyebrow mb-2 inline-flex items-center gap-1.5 text-emerald-700">
                <BookmarkIcon className="w-3.5 h-3.5" />
                이건 꼭 봐 — 벤치마킹
              </p>
              {item.benchmark.criteria.length > 0 && (
                <div className="mb-2.5 flex items-center gap-1.5 flex-wrap">
                  {item.benchmark.criteria.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center h-5 px-2 rounded-full bg-white text-emerald-700 text-[10px] font-medium ring-1 ring-emerald-600/15"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs font-semibold text-neutral-500 mb-1">왜 통했나</p>
              <p className="text-sm leading-[1.7] text-neutral-800 whitespace-pre-line mb-3">
                {item.benchmark.why}
              </p>
              <p className="text-xs font-semibold text-neutral-500 mb-1">
                이렇게 다시 사랑받아요
              </p>
              <p className="text-sm leading-[1.7] text-neutral-800 whitespace-pre-line">
                {item.benchmark.how}
              </p>
              {item.benchmark.tryThis && (
                <>
                  <p className="text-xs font-semibold text-neutral-500 mb-1 mt-3">
                    우리도 꼭 해 봐요
                  </p>
                  <p className="text-sm leading-[1.7] text-neutral-800 whitespace-pre-line">
                    {item.benchmark.tryThis}
                  </p>
                </>
              )}
              {item.benchmark.effect && (
                <>
                  <p className="text-xs font-semibold text-neutral-500 mb-1 mt-3 inline-flex items-center gap-1.5">
                    가장 클 효과
                    <span className="inline-flex items-center h-5 px-2 rounded-full bg-white text-emerald-700 text-[10px] font-medium ring-1 ring-emerald-600/15">
                      {item.benchmark.effect}
                    </span>
                  </p>
                  {item.benchmark.effectWhy && (
                    <p className="text-sm leading-[1.7] text-neutral-800 whitespace-pre-line">
                      {item.benchmark.effectWhy}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 지표 — 인스타가 공개하는 수치만. 없는 줄은 아예 그리지 않는다. */}
          <InsightsBox
            insights={insights}
            viewsCount={viewsCount}
            spike={fetched?.spike ?? item.spike}
          />

          {/* 댓글 원문 — 누가 무슨 말을 했는지가 숫자보다 중요하다. */}
          {comments.length > 0 && <CommentsBox comments={comments} />}

          {/* AI 핵심 요약 — Korean-native items (sermons/lectures). */}
          {item.summary && (
            <div className="rounded-xl bg-neutral-950/[0.02] ring-1 ring-neutral-950/5 p-4">
              <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5 text-neutral-400" />
                핵심 요약
              </p>
              <p className="text-sm leading-[1.7] text-neutral-800 whitespace-pre-line">
                {item.summary}
              </p>
            </div>
          )}

          {/* view-mode toggle — bilingual sources only (Mosseri). */}
          {bilingual && (
            <div className="flex items-center gap-2">
              <LanguageIcon className="w-4 h-4 text-neutral-400" />
              <div className="inline-flex rounded-full bg-neutral-950/[0.04] p-0.5">
                {(
                  [
                    ["both", "원문+번역"],
                    ["ko", "한국어"],
                    ["en", "원문"],
                  ] as [ReadMode, string][]
                ).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`h-8 px-3 text-xs font-medium rounded-full transition ${
                      mode === m
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isYouTube && <Section title="캡션" body={item.caption} mode={mode} />}

          {hasTranscript ? (
            <div>
              <Section
                title={isYouTube ? (bilingual ? "자막" : "전사 (원문 그대로)") : "대본"}
                body={transcript!}
                mode={bilingual ? mode : "ko"}
              />
              {false && (
                <div className="mt-2">
                  <button
                    onClick={runTranscribe}
                    disabled={transcribing}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-950/[0.03] disabled:opacity-50 transition"
                  >
                    <ArrowPathIcon
                      className={`w-3.5 h-3.5 ${transcribing ? "animate-spin" : ""}`}
                    />
                    {transcribing
                      ? "대본 다시 생성 중… (음성 전사)"
                      : "대본 다시 생성"}
                  </button>
                  {txError && (
                    <p className="text-[11px] text-red-600 mt-1.5">{txError}</p>
                  )}
                </div>
              )}
            </div>
          ) : isYouTube ? (
            <div className="rounded-xl bg-neutral-950/[0.02] ring-1 ring-neutral-950/5 p-4">
              <p className="eyebrow mb-1.5">전사</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                이 영상은 한국어 자막이 없어 전사를 가져오지 못했어요.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-neutral-950/[0.02] ring-1 ring-neutral-950/5 p-4">
              <p className="eyebrow mb-1.5">대본</p>
              {isPhotoPost ? (
                // 사진·여러 장 글은 소리 자체가 없다. 버튼을 주면 눌러도
                // "영상 형식을 못 찾았다"는 오류만 나오므로 아예 감춘다.
                <p className="text-xs text-neutral-500 leading-relaxed">
                  사진 글이라 소리가 없어요. 대본이 없는 게 맞습니다.
                </p>
              ) : item.transcriptTried && !txError ? (
                <p className="text-xs text-neutral-500 leading-relaxed">
                  이 영상은 인스타그램이 소리 없이 내보내서 대본을 만들지
                  못했어요. 음원 저작권 때문에 소리가 빠진 영상에서 주로
                  생깁니다.
                </p>
              ) : (
                <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                  이 영상은 아직 대본을 만들지 않았어요.
                </p>
              )}
              {false && (
              <button
                onClick={runTranscribe}
                disabled={transcribing}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-medium rounded-full bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 transition"
              >
                {transcribing ? (
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <DocumentTextIcon className="w-3.5 h-3.5" />
                )}
                {transcribing ? "대본 생성 중… (음성 전사 + 번역)" : txError ? "다시 시도" : "대본 생성"}
              </button>
              )}
              {txError && (
                <p className="text-[11px] text-red-600 mt-2">{txError}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 shadow-[0_-1px_0_0_rgba(10,10,10,0.05)]">
          <span />
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 h-9 px-5 text-xs font-medium rounded-full bg-neutral-950 text-white hover:bg-neutral-800 transition"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            {isYouTube ? "유튜브에서 보기" : "인스타그램에서 보기"}
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-neutral-400 shrink-0">{label}</span>
      <span className="text-neutral-700 text-right">{children}</span>
    </div>
  );
}

// 지표 — 있는 값만 줄로 세운다. 모르는 값은 "확인 불가"라고 적지 않고 뺀다.
function InsightsBox({
  insights,
  viewsCount,
  spike,
}: {
  insights?: PostInsights;
  viewsCount?: number;
  spike?: SpikeMark;
}) {
  const views = insights?.views ?? viewsCount;
  const rate = insights?.engagementRate;
  const rows: [string, string][] = [];
  if (typeof views === "number") rows.push(["조회수", nf(views)]);
  if (typeof insights?.likes === "number") rows.push(["좋아요", nf(insights.likes)]);
  if (typeof insights?.comments === "number") rows.push(["댓글", nf(insights.comments)]);
  if (typeof rate === "number") rows.push(["참여율", `${Number(rate.toFixed(1))}%`]);
  if (typeof insights?.durationSec === "number")
    rows.push(["영상 길이", durationText(insights.durationSec)]);
  if (insights?.musicTitle) rows.push(["음원", insights.musicTitle]);
  if (spike) rows.push(["반응이 튄 축", spikeMarks(spike).map(spikeText).join(" · ")]);

  const tags = insights?.hashtags ?? [];
  if (rows.length === 0 && tags.length === 0) return null;

  return (
    <div className="rounded-xl bg-neutral-950/[0.02] ring-1 ring-neutral-950/5 p-4">
      <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
        <ChartBarIcon className="w-3.5 h-3.5 text-neutral-400" />
        지표
      </p>
      {rows.length > 0 && (
        <div className="grid gap-2 text-sm">
          {rows.map(([label, value]) => (
            <Row key={label} label={label}>
              <span className="tnum">{value}</span>
            </Row>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center h-5 px-2 rounded-full bg-white text-neutral-600 text-[10px] font-medium ring-1 ring-neutral-950/5"
            >
              #{t.replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 댓글 원문. 처음엔 30개만 그리고, 나머지는 눌러서 편다(이미 다 받아 둔 값이다).
const COMMENT_PREVIEW = 30;

function CommentsBox({ comments }: { comments: PostComment[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? comments : comments.slice(0, COMMENT_PREVIEW);
  const rest = comments.length - COMMENT_PREVIEW;

  return (
    <div>
      <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
        <ChatBubbleOvalLeftIcon className="w-3.5 h-3.5 text-neutral-400" />
        댓글 원문
        <span className="tnum font-normal text-neutral-400">{nf(comments.length)}</span>
      </p>
      <div className="rounded-xl bg-neutral-950/[0.02] ring-1 ring-neutral-950/5 overflow-hidden">
        {shown.map((c, i) => (
          <div
            key={c.id || `${c.username}-${i}`}
            className={`px-4 py-3 ${
              i > 0 ? "shadow-[0_-1px_0_0_rgba(10,10,10,0.05)]" : ""
            } ${c.replyToId ? "pl-9" : ""}`}
          >
            <p className="flex items-center gap-2 flex-wrap text-[11px]">
              <span
                className={
                  c.isOwner ? "font-semibold text-neutral-900" : "text-neutral-500"
                }
              >
                @{c.username}
              </span>
              {c.isOwner && (
                <span className="inline-flex items-center h-4 px-1.5 rounded-full bg-neutral-950/[0.06] text-[10px] font-medium text-neutral-600">
                  계정 주인
                </span>
              )}
              {(c.likes ?? 0) > 0 && (
                <span className="inline-flex items-center gap-0.5 tnum text-neutral-400">
                  <HeartIcon className="w-3 h-3" />
                  {nf(c.likes!)}
                </span>
              )}
              {c.date && <span className="tnum text-neutral-300">{c.date}</span>}
            </p>
            <p className="mt-1 text-sm leading-[1.6] text-neutral-800 whitespace-pre-line">
              {c.text}
            </p>
          </div>
        ))}
      </div>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 inline-flex items-center h-8 px-3 text-xs font-medium rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-950/[0.03] transition"
        >
          {all ? "접기" : `더 보기 (${nf(rest)}개)`}
        </button>
      )}
    </div>
  );
}

// Immersive-translate style reader: per paragraph, the original and its Korean
// translation are stacked. For Korean-native items the original IS Korean (en is
// empty), so only the Korean line renders.
function Section({
  title,
  body,
  mode,
}: {
  title: string;
  body: BilingualText;
  mode: ReadMode;
}) {
  if (!body || body.blocks.length === 0) return null;
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <div className="space-y-4">
        {body.blocks.map((b, i) => (
          <div key={i} className="space-y-1">
            {(mode === "both" || mode === "en") && b.en && (
              <p
                className={`text-sm leading-[1.6] ${
                  mode === "both" ? "text-neutral-400" : "text-neutral-800"
                }`}
              >
                {b.en}
              </p>
            )}
            {(mode === "both" || mode === "ko") && b.ko && (
              <p className="text-sm leading-[1.65] text-neutral-900">{b.ko}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
