export type JobStatus = "en_route" | "in_queue" | "awaiting_pin" | "flagged" | "delivered";
export type JobType = "Delivery" | "Queuing" | "Document" | "Shopping" | "Errand";

export interface Job {
  id: string;
  route: string;
  runnerName: string;
  runnerColor: string;
  type: JobType;
  status: JobStatus;
  eta: string;
}

export interface Exception {
  id: string;
  jobId: string;
  runnerName: string;
  location: string;
  headline: string;
}

export interface RunnerPin {
  name: string;
  color: string;
  x: number; // percentage
  y: number; // percentage
}

// ---- Customer-facing types ----
// Delivery proof depends on where the runner is handing the job off:
// "location"  -> runner uploads a photo as proof (e.g. dropped at a gate/reception)
// "person"    -> runner enters a PIN given to them by the receiver (Uber/Zulzi-style)

export type DeliveryMode = "location" | "person";

export type CustomerTaskStatus =
  | "posted" // waiting on quotes / runner acceptance
  | "accepted" // a runner has been confirmed, funds held in escrow
  | "in_progress" // runner is actively working the task
  | "awaiting_confirmation" // runner marked it done, waiting on customer approval (or 72hr auto-release)
  | "completed" // customer approved (or it auto-released) and the runner has been paid
  | "disputed" // customer flagged an issue, sent to a supervisor
  | "cancelled";

export interface Quote {
  id: string;
  runnerName: string;
  runnerRating: number; // out of 5
  price: number; // in Rand
  note?: string;
}

export interface CustomerTask {
  id: string;
  title: string;
  category: JobType;
  description: string;
  deliveryMode: DeliveryMode;
  location: string;
  deadline: string;
  budget: number | null; // null = "let runners quote"
  status: CustomerTaskStatus;
  quotes: Quote[];
  acceptedQuote?: Quote;
  proofPhotoUrl?: string;
  pin?: string; // only set when deliveryMode === "person"
  deliveredAt?: string; // ISO timestamp — when the runner marked it done
  autoReleaseAt?: string; // deliveredAt + 72h, ISO timestamp
  completedAt?: string;
  createdAt: string;
  rating?: { stars: number; comment: string };
}

export interface WalletTransaction {
  id: string;
  taskId?: string;
  type: "hold" | "release" | "topup" | "refund";
  amount: number;
  date: string;
  description: string;
}