import client from "./client";
import { Equipment, EquipmentLoan } from "../types";

export async function listEquipment(
  filters?: Record<string, string>
): Promise<Equipment[]> {
  const { data } = await client.get("/api/equipment", { params: filters });
  return Array.isArray(data) ? data : data.equipment || data.data || [];
}

export async function getEquipment(id: string): Promise<Equipment> {
  const { data } = await client.get(`/api/equipment/${id}`);
  return data;
}

export async function createEquipment(
  payload: Partial<Equipment>
): Promise<Equipment> {
  const { data } = await client.post("/api/equipment", payload);
  return data;
}

export async function updateEquipment(
  id: string,
  payload: Partial<Equipment>
): Promise<Equipment> {
  const { data } = await client.put(`/api/equipment/${id}`, payload);
  return data;
}

export async function deleteEquipment(id: string): Promise<void> {
  await client.delete(`/api/equipment/${id}`);
}

export async function getEquipmentLoans(
  id: string
): Promise<EquipmentLoan[]> {
  const { data } = await client.get(`/api/equipment/${id}/loans`);
  return Array.isArray(data) ? data : data.loans || data.data || [];
}
