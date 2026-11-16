export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface QueueJobProgress {
  generationId: string;
  stage: string;
  updatedAt: number;
}
