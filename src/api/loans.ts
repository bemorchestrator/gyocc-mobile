import client from "./client";
import { EquipmentLoan } from "../types";

export async function listLoans(
  filters?: Record<string, string>
): Promise<EquipmentLoan[]> {
  const { data } = await client.get("/api/equipment-loans", {
    params: filters,
  });
  return Array.isArray(data) ? data : data.loans || data.data || [];
}

export async function createLoan(
  payload: Partial<EquipmentLoan>
): Promise<EquipmentLoan> {
  const { data } = await client.post("/api/equipment-loans", payload);
  return data;
}

export async function returnLoan(
  id: string,
  payload: { actualReturnDate: string; conditionOnReturn: string; notes?: string }
): Promise<EquipmentLoan> {
  const { data } = await client.patch(
    `/api/equipment-loans/${id}/return`,
    payload
  );
  return data;
}

export async function deleteLoan(id: string): Promise<void> {
  await client.delete(`/api/equipment-loans/${id}`);
}
