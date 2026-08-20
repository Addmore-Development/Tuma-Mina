// types/types.ts
// Types scoped to the logged-in Customer's own dashboard/view.
// (See types/platform.ts for the platform-wide equivalents used by Admin,
// Supervisor, and Runner.)

export type JobType = "Delivery" | "Document" | "Queuing" | "Shopping" | "Errand";

export type DeliveryMode = "location" | "person" | "courier";

export type CourierProvider = "Courier Guy" | "Pexi";

export type CustomerTaskStatus =
  | "posted"
  | "accepted"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "disputed"
  | "cancelled";

export interface QuoteHistoryEntry {
  by: "customer" | "runner";
  price: number;
  at: string;
  note?: string;
}

export interface Quote {
  id: string;
  runnerName: string;
  runnerRating: number;
  price: number;
  note?: string;
  status: "open" | "awaiting_runner";
  history?: QuoteHistoryEntry[];
}

export interface TaskRating {
  stars: number;
  comment: string;
}

export interface CustomerTask {
  id: string;
  title: string;
  category: JobType;
  description: string;
  deliveryMode: DeliveryMode;
  location: string;
  deadline: string;
  budget: number | null;
  status: CustomerTaskStatus;
  quotes: Quote[];
  acceptedQuote?: Quote;
  referencePhotos?: string[];
  // Set when deliveryMode is "person" — shared with the receiver, entered by
  // the runner on hand-off to confirm delivery.
  pin?: string;
  // Set when deliveryMode is "courier" — the runner must supply these before
  // the customer can approve/release payment, since there's no PIN or
  // in-person proof for a third-party courier hand-off.
  courierProvider?: CourierProvider;
  trackingNumber?: string;
  proofPhotoUrl?: string;
  // Set when deliveryMode is "location" — where the runner actually dropped
  // it off, captured from their device on submission, so the customer can
  // see it on a map alongside the proof photo.
  dropLat?: number;
  dropLng?: number;
  deliveredAt?: string;
  // When payment auto-releases to the runner if the customer doesn't
  // explicitly approve first (see AUTO_RELEASE_HOURS in TaskDetail.tsx).
  autoReleaseAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  rating?: TaskRating;
  createdAt: string;
  // True once the customer has moved the task's price from wallet balance
  // into escrow via fundTask(). Only possible after a runner has accepted
  // (status "accepted" or later) — accepting a job no longer holds funds
  // itself. Payment can't be released to the runner until this is true.
  funded: boolean;
}

// --- Wallet --------------------------------------------------------------

export type WalletTransactionType = "hold" | "release" | "topup" | "refund";

export interface WalletTransaction {
  id: string;
  taskId?: string;
  type: WalletTransactionType;
  amount: number;
  date: string;
  description: string;
}

// --- Profile ---------------------------------------------------------------

export interface CustomerProfile {
  name: string;
  surname: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  notifyTaskUpdates: boolean;
  notifyPromotions: boolean;
}