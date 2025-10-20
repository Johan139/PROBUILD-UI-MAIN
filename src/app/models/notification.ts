export interface Notification {
  id: number;
  message: string;
  timestamp: Date;
  jobId: number;
  projectName: string;
  senderFullName: string;
  unread?: boolean;
}
