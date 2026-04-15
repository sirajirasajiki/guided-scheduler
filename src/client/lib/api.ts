import type {
  CreateEventRequest,
  CreateEventResponse,
  GetEventAdminResponse,
  GetEventShareResponse,
  SubmitParticipantRequest,
  SubmitParticipantResponse,
  ConfirmDateRequest,
  AddRestaurantRequest,
  AddRestaurantResponse,
} from "../../shared/types";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createEvent(data: CreateEventRequest) {
    return request<CreateEventResponse>("/api/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getEventAdmin(adminToken: string) {
    return request<GetEventAdminResponse>(`/api/events/admin/${adminToken}`);
  },

  getEventShare(shareToken: string) {
    return request<GetEventShareResponse>(`/api/events/share/${shareToken}`);
  },

  submitParticipant(shareToken: string, data: SubmitParticipantRequest) {
    return request<SubmitParticipantResponse>(
      `/api/events/share/${shareToken}/participants`,
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  confirmDate(adminToken: string, data: ConfirmDateRequest) {
    return request<{ confirmedDate: string }>(
      `/api/events/admin/${adminToken}/confirm`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  },

  addRestaurant(adminToken: string, data: AddRestaurantRequest) {
    return request<AddRestaurantResponse>(
      `/api/events/admin/${adminToken}/restaurants`,
      { method: "POST", body: JSON.stringify(data) }
    );
  },
};
