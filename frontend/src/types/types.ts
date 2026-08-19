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
  deliveredAt?: string;
  // When payment auto-releases to the runner if the customer doesn't
  // explicitly approve first (see AUTO_RELEASE_HOURS in TaskDetail.tsx).
  autoReleaseAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  rating?: TaskRating;
  createdAt: string;
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