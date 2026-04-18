// 候補日への回答値
export type ResponseValue = "o" | "d" | "x";

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
  createdAt: number;
};

export type RestaurantRow = {
  id: string;
  name: string;
  url: string | null;
  memo: string | null;
  voteCount: number;
  createdAt: number;
};

export type VoteRow = {
  restaurantId: string;
  participantName: string;
};

export type GetEventAdminResponse = {
  eventId: string;
  name: string;
  candidateDates: string[];
  confirmedDate: string | null;
  participants: ParticipantRow[];
  restaurants: RestaurantRow[];
  votes: VoteRow[];
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

// --- 店への投票 ---
export type VoteRestaurantRequest = {
  participantName: string;
  restaurantId: string;
};

export type VoteRestaurantResponse = {
  voteId: string;
};
