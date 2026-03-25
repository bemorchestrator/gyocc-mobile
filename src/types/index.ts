export interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  image?: string;
}

export interface Equipment {
  _id: string;
  name: string;
  category: string;
  description?: string;
  serialNumber?: string;
  totalQty: number;
  availableQty: number;
  condition: "Excellent" | "Good" | "Fair" | "Poor";
  isFromDtiGrant?: boolean;
  grantYear?: number;
  acquisitionDate?: string;
  acquisitionCost?: number;
  notes?: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface EquipmentLoan {
  _id: string;
  equipmentId: string;
  equipmentName: string;
  qtyBorrowed: number;
  borrowerType: "member" | "msme" | "individual";
  borrowerName: string;
  borrowerAddress: string;
  borrowerContact?: string;
  borrowerGender?: "Male" | "Female" | "Other";
  dateBorrowed: string;
  expectedReturnDate?: string;
  actualReturnDate: string | null;
  conditionOnLoan?: string;
  conditionOnReturn?: string;
  purpose: string;
  venue: string;
  notes?: string;
  createdAt: string;
}

export type EquipmentCondition = Equipment["condition"];
export type BorrowerType = EquipmentLoan["borrowerType"];

// ── Members ──────────────────────────────────────────────────────────────────
export interface Member {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  section: "Choir" | "Orchestra" | "Both";
  rank: "Conductor" | "Senior" | "Junior" | "Apprentice";
  level: 1 | 2 | null;
  status: "Active" | "Inactive" | "On Leave";
  joinDate: string;
  notes?: string;
  createdAt: string;
}

// ── Gigs ────────────────────────────────────────────────────────────────────

export type GigStatus = "Inquiry" | "Confirmed" | "Completed" | "Cancelled";

export interface GigClient {
  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
}

export interface GigVenue {
  name?: string;
  address?: string;
  mapUrl?: string;
}

export interface ProgramItem {
  time?: string;
  title: string;
}

export interface Gig {
  _id: string;
  title: string;
  type: string;
  status: GigStatus;
  startDate: string;
  endDate: string;
  contractedFee: number;
  client?: GigClient;
  venue?: GigVenue;
  virtualLink?: string;
  notes?: string;
  program?: ProgramItem[];
  createdAt: string;
}

export interface GigType {
  _id: string;
  name: string;
  color: string;
}

export interface GigParticipant {
  _id: string;
  gigId: string;
  memberId?: string;
  name: string;
  email?: string;
  rank?: string;
  level?: number | null;
  role?: string;
  isExternal: boolean;
  confirmation: "Pending" | "Confirmed" | "Declined";
  attended: boolean;
  payoutMode: "rate" | "custom";
  payoutAmount: number;
  notes?: string;
}

export interface GigExpense {
  _id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  notes?: string;
}

export interface GigFinance {
  contractedFee: number;
  expenses: GigExpense[];
  totalExpenses: number;
  netIncome: number;
  totalPayouts: number;
  remaining: number;
  payoutRows: {
    _id: string;
    name: string;
    rank?: string;
    level?: number | null;
    role?: string;
    isExternal: boolean;
    confirmation: string;
    attended: boolean;
    payoutMode: string;
    payoutAmount: number;
  }[];
}

export interface GigLoan {
  _id: string;
  equipmentId: string;
  equipmentName: string;
  qtyBorrowed: number;
  borrowerName: string;
  conditionOnLoan: string;
  conditionOnReturn?: string;
  actualReturnDate?: string | null;
  status?: string;
}
