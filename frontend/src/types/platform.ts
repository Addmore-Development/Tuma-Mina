

export const TOWNS = ["Rustenburg", "Johannesburg", "Pretoria"] as const;
export type TownName = (typeof TOWNS)[number];

export type JobCategory = "Delivery" | "Document" | "Queuing" | "Shopping" | "Errand";

export type PlatformJobStatus =
  | "posted"
  | "accepted"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "disputed"
  | "cancelled";

// A job as seen by Admin/Supervisor/Runner — i.e. the platform-wide view,
// as opposed to CustomerTask in types/types.ts which is the same job as
// seen from the customer's own dashboard.
export interface PlatformJob {
  id: string;
  title: string;
  category: JobCategory;
  town: TownName;
  location: string;
  customerName: string;
  runnerName?: string;
  status: PlatformJobStatus;
  price: number;
  platformFee: number;
  postedAt: string;
  deadline: string;
}

// --- Runner KYC / verification -------------------------------------------

export interface KYCDocument {
  fileName: string;
  uploadedAt: string;
  status: "pending" | "verified" | "rejected";
  // TODO: once uploads go to real storage (S3 / Supabase storage bucket),
  // add `url: string` here so Admin's "View" button can open the real file.
}

export type RunnerApplicationStatus = "pending" | "approved" | "rejected";

export interface RunnerApplication {
  id: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
  town: TownName;
  idNumber: string;
  address: string;
  headshot: KYCDocument | null;
  idDocument: KYCDocument | null;
  bankProof: KYCDocument | null;
  addressProof: KYCDocument | null;
  appliedAt: string;
  status: RunnerApplicationStatus;
  rejectionReason?: string;
}

/**
 * A runner application is only approvable once every required document has
 * been submitted. Used by AdminDashboard to disable the Approve button and
 * explain why.
 */
export function isApplicationComplete(a: RunnerApplication): boolean {
  return Boolean(
    a.idNumber.trim() &&
      a.address.trim() &&
      a.headshot &&
      a.idDocument &&
      a.bankProof &&
      a.addressProof
  );
}

// --- Approved runners -------------------------------------------------------

export type RunnerStatus = "active" | "suspended";

export interface RunnerProfile {
  id: string;
  applicationId: string;
  name: string;
  town: TownName;
  phone: string;
  email: string;
  rating: number;
  completedJobs: number;
  status: RunnerStatus;
  joinedAt: string;
}

// --- Supervisors -------------------------------------------------------------

export type SupervisorStatus = "active" | "suspended";

export interface SupervisorAccount {
  id: string;
  name: string;
  email: string;
  town: TownName | "All towns";
  createdAt: string;
  status: SupervisorStatus;
  // Admin-controlled: whether this supervisor can see escrow/wallet/revenue
  // data on their dashboard. Defaults to true when created, but admin can
  // flip it per-supervisor at any time.
  canViewFinancials: boolean;
}