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

export type GetEventAdminResponse = {
  eventId: string;
  name: string;
  candidateDates: string[];
  confirmedDate: string | null;
  participants: ParticipantRow[];
  createdAt: number;
};

// --- 共有用取得 ---
export type GetEventShareResponse = {
  eventId: string;
  name: string;
  candidateDates: string[];
  confirmedDate: string | null;
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
