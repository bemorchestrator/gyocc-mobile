import client from "./client";

export interface AnnualReport {
  year: number;
  gigIncome: number;
  totalExpenses: number;
  netIncome: number;
  totalPayouts: number;
  remaining: number;
  gigCount: number;
}

export async function getAnnualReport(year?: number): Promise<AnnualReport> {
  const y = year ?? new Date().getFullYear();
  const { data } = await client.get(`/api/reports/annual?year=${y}`);
  return data;
}
