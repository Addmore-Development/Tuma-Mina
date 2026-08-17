// Mirrors the SQL enums/tables in schema.sql. Import these in your service
// files instead of redefining shapes ad hoc.

export type TownName = "Rustenburg" | "Johannesburg" | "Pretoria";
export type JobCategory = "Delivery" | "Document" | "Queuing" | "Shopping" | "Errand";
export type DeliveryMode = "location" | "person";
export type JobStatus =
  | "posted" | "accepted" | "in_progress" | "awaiting_confirmation"
  | "completed" | "disputed" | "cancelled";
export type QuoteStatus = "open" | "awaiting_runner";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type DocStatus = "pending" | "verified" | "rejected";
export type WalletTxType = "hold" | "release" | "topup" | "refund";
export type AccountStatus = "active" | "suspended";

export interface DbTask {
  id: string;
  display_id: string;
  customer_id: string;
  runner_id: string | null;
  title: string;
  category: JobCategory;
  description: string;
  delivery_mode: DeliveryMode;
  location: string;
  town: TownName;
  deadline: string;
  budget: number | null;
  status: JobStatus;
  price: number | null;
  platform_fee: number | null;
  pin: string | null;
  reference_photos: string[];
  proof_photo_path: string | null;
  delivered_at: string | null;
  auto_release_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
}

export interface DbQuote {
  id: string;
  task_id: string;
  runner_id: string;
  price: number;
  note: string | null;
  status: QuoteStatus;
  created_at: string;
}

export interface DbRunnerApplication {
  id: string;
  user_id: string;
  town: TownName;
  id_number: string;
  address: string;
  headshot_path: string | null;
  headshot_status: DocStatus;
  id_document_path: string | null;
  id_document_status: DocStatus;
  bank_proof_path: string | null;
  bank_proof_status: DocStatus;
  address_proof_path: string | null;
  address_proof_status: DocStatus;
  status: ApplicationStatus;
  rejection_reason: string | null;
  applied_at: string;
}

export interface DbRunnerProfile {
  id: string;
  application_id: string;
  town: TownName;
  rating: number;
  completed_jobs: number;
  status: AccountStatus;
  joined_at: string;
}

export interface DbSupervisorProfile {
  id: string;
  town: TownName | null;
  can_view_financials: boolean;
  status: AccountStatus;
  created_at: string;
}

export interface DbWalletTransaction {
  id: string;
  customer_id: string;
  task_id: string | null;
  type: WalletTxType;
  amount: number;
  description: string;
  created_at: string;
}