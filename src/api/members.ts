import client from "./client";
import { Member } from "../types";

export async function listMembers(): Promise<Member[]> {
  const { data } = await client.get("/api/members");
  return Array.isArray(data) ? data : data.members || [];
}

export async function getMember(id: string): Promise<Member> {
  const { data } = await client.get(`/api/members/${id}`);
  return data;
}

export async function createMember(payload: Partial<Member>): Promise<Member> {
  const { data } = await client.post("/api/members", payload);
  return data;
}

export async function updateMember(id: string, payload: Partial<Member>): Promise<Member> {
  const { data } = await client.put(`/api/members/${id}`, payload);
  return data;
}

export async function deleteMember(id: string): Promise<void> {
  await client.delete(`/api/members/${id}`);
}
