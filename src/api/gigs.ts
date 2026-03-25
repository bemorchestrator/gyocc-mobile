import client from "./client";

// ── Gigs ────────────────────────────────────────────────────────────────────

export async function listGigs(params?: {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
}) {
  const { data } = await client.get("/api/gigs", { params });
  return (data?.gigs ?? data) as any[];
}

export async function getGig(id: string) {
  const { data } = await client.get(`/api/gigs/${id}`);
  return data;
}

export async function createGig(payload: Record<string, unknown>) {
  const { data } = await client.post("/api/gigs", payload);
  return data;
}

export async function updateGig(id: string, payload: Record<string, unknown>) {
  const { data } = await client.put(`/api/gigs/${id}`, payload);
  return data;
}

export async function deleteGig(id: string) {
  await client.delete(`/api/gigs/${id}`);
}

export async function setGigStatus(id: string, status: string) {
  const { data } = await client.post(`/api/gigs/${id}/status`, { status });
  return data;
}

// ── Gig Types ────────────────────────────────────────────────────────────────

export async function listGigTypes() {
  const { data } = await client.get("/api/gig-types");
  return (Array.isArray(data) ? data : data?.types ?? []) as any[];
}

// ── Participants ─────────────────────────────────────────────────────────────

export async function listParticipants(gigId: string) {
  const { data } = await client.get(`/api/gigs/${gigId}/participants`);
  return (data?.participants ?? data) as any[];
}

export async function addParticipant(gigId: string, payload: Record<string, unknown>) {
  const { data } = await client.post(`/api/gigs/${gigId}/participants`, payload);
  return data;
}

export async function updateParticipant(
  gigId: string,
  pid: string,
  payload: Record<string, unknown>
) {
  const { data } = await client.patch(
    `/api/gigs/${gigId}/participants/${pid}`,
    payload
  );
  return data;
}

export async function removeParticipant(gigId: string, pid: string) {
  await client.delete(`/api/gigs/${gigId}/participants/${pid}`);
}

// ── Finance / Expenses ────────────────────────────────────────────────────────

export async function getGigFinance(gigId: string) {
  const { data } = await client.get(`/api/gigs/${gigId}/finance`);
  return data;
}

export async function createExpense(payload: Record<string, unknown>) {
  const { data } = await client.post("/api/expenses", payload);
  return data;
}

export async function deleteExpense(id: string) {
  await client.delete(`/api/expenses/${id}`);
}

// ── Equipment ─────────────────────────────────────────────────────────────────

export async function listGigEquipment(gigId: string) {
  const { data } = await client.get(`/api/gigs/${gigId}/equipment`);
  return (data?.loans ?? data) as any[];
}

// ── Members (for participant picker) ─────────────────────────────────────────

export async function listMembers() {
  const { data } = await client.get("/api/members");
  return (data?.members ?? data) as any[];
}

// ── Gig Type CRUD ─────────────────────────────────────────────────────────────

export async function createGigType(payload: { name: string; color: string }) {
  const { data } = await client.post("/api/gig-types", payload);
  return data;
}

export async function updateGigType(id: string, payload: { name?: string; color?: string }) {
  const { data } = await client.put(`/api/gig-types/${id}`, payload);
  return data;
}

export async function deleteGigType(id: string) {
  await client.delete(`/api/gig-types/${id}`);
}
