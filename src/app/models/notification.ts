export interface Notification {
  id: number;
  message: string;
  timestamp: Date;
  projectId: number;
  projectName: string;
  senderFullName: string;
}
