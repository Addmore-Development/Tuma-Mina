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