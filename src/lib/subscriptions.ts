// 이 앱이 보여 주는 계정. 원래 대시보드에서는 여러 계정을 칩으로 오갔고,
// 여기에는 심플리홈 하나만 남겼다. 화면 코드가 같은 모양을 쓰도록 목록 형태는 그대로 둔다.

export type Platform = "instagram" | "youtube";
export type SubscriptionRole = "read" | "coach";

export interface Subscription {
  id: string;
  name: string;
  role: SubscriptionRole;
  topic: string;
  coachedAt?: string;
  platform: Platform;
  source?: string;
  username?: string;
  authorName?: string;
  lang: "en" | "ko";
  showCategoryChips: boolean;
  categories?: string[];
}

export const SUBSCRIPTIONS: Subscription[] = [
  {
    id: "simplyhome",
    role: "coach",
    topic: "살림",
    coachedAt: "2026-09-11",
    name: "심플리홈",
    platform: "instagram",
    source: "https://www.instagram.com/__simplyhome/",
    username: "__simplyhome",
    authorName: "박서아",
    lang: "ko",
    showCategoryChips: true,
    categories: [
      "공구 오픈·마감",
      "살림템 추천",
      "정리·비움",
      "밥·먹거리",
      "육아·아이 셋",
      "가족·부부",
      "이벤트·참여",
      "브랜드 협업",
      "일상 공유",
    ],
  },
];

export const DEFAULT_SOURCE = "simplyhome";

export function subscriptionById(id: string | undefined): Subscription | undefined {
  return SUBSCRIPTIONS.find((s) => s.id === (id || DEFAULT_SOURCE));
}
