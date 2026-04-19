// 候補日への回答値
export type ResponseValue = "o" | "d" | "x";

// アレルギー情報
export const ALLERGEN_LIST = ["卵", "乳", "小麦", "えび", "かに", "そば", "落花生", "くるみ"] as const;

export type AllergyInfo = {
  items: string[]; // ALLERGEN_LIST から選択したもの
  otherText: string | null; // 「その他」の内容（チェックなし時は null）
};

// --- イベント作成 ---
export type CreateEventRequest = {
  name: string;
  candidateDates: string[]; // ISO date strings (YYYY-MM-DD)
};

export type CreateEventResponse = {
  eventId: string;
  adminToken: string;
  shareToken: string;
};

// --- 管理用取得 ---
export type ParticipantRow = {
  id: string;
  name: string;
  responses: Record<string, ResponseValue>; // { "2026-05-01": "o", ... }
  allergies: AllergyInfo | null;
  createdAt: number;
};

export type RestaurantRow = {
  id: string;
  name: string;
  url: string | null;
  memo: string | null;
  createdAt: number;
};

export type GetEventAdminResponse = {
  eventId: string;
  name: string;
  candidateDates: string[];
  confirmedDate: string | null;
  participants: ParticipantRow[];
  restaurants: RestaurantRow[];
  createdAt: number;
};

// --- 共有用取得 ---
export type GetEventShareResponse = {
  eventId: string;
  name: string;
  candidateDates: string[];
  confirmedDate: string | null;
  restaurants: RestaurantRow[];
};

// --- 回答送信 ---
export type SubmitParticipantRequest = {
  name: string;
  responses: Record<string, ResponseValue>;
  allergies?: AllergyInfo;
};

export type SubmitParticipantResponse = {
  participantId: string;
};

// --- 確定日決定 ---
export type ConfirmDateRequest = {
  date: string; // ISO date string
};

// --- 店候補 ---
export type AddRestaurantRequest = {
  name: string;
  url?: string;
  memo?: string;
};

export type AddRestaurantResponse = {
  restaurantId: string;
};
