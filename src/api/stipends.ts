import client from "./client";

export type StipendContractStatus = "scheduled" | "active" | "expired" | "terminated" | "suspended";

export type StipendDisbursementStatus = "scheduled" | "on_hold" | "disbursed" | "acknowledged" | "cancelled";

export type StipendDisbursementMethod = "cash" | "gcash" | "maya" | "bank_transfer" | "other";

export interface StipendMemberRef {
  _id: string;
  name: string;
  rank: string;
  level: 1 | 2 | null;
}

export interface StipendContractDTO {
  _id: string;
  member: string | StipendMemberRef;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  status: StipendContractStatus;
  rankSnapshot: string;
  levelSnapshot: 1 | 2 | null;
  contractSignedDate: string | null;
  financiallyChallenged: boolean;
  policyVersion: number;
  applicationId: string | null;
  eligibilitySnapshotId: string | null;
  renewalOf: string | null;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StipendDisbursementDTO {
  _id: string;
  member: string | StipendMemberRef;
  contract: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  scheduledDate: string;
  status: StipendDisbursementStatus;
  method: StipendDisbursementMethod | null;
  referenceNumber: string;
  proofUrl: string;
  disbursedDate: string | null;
  disbursedBy: string;
  acknowledgedDate: string | null;
  acknowledgementNote: string;
  acknowledgementSignature: string;
  policyVersion: number;
  eligibilitySnapshotId: string | null;
  releaseReasons: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyStipends {
  contracts: StipendContractDTO[];
  disbursements: StipendDisbursementDTO[];
  totalReceived: number;
  acknowledgementRequired: boolean;
}

export async function getMyStipends(): Promise<MyStipends> {
  const { data } = await client.get("/api/stipends/me");
  return data;
}

export async function acknowledgeStipend(id: string, signature: string, note?: string): Promise<void> {
  await client.post(`/api/stipends/me/disbursements/${id}/acknowledge`, { signature, note });
}
