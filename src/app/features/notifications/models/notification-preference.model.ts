import { NotificationType, NotificationChannel } from './notification.enums';

export interface NotificationPreference {
  notificationType: NotificationType;
  channel: NotificationChannel;
  isEnabled: boolean;
}

export interface UpdateNotificationPreferenceDto {
  notificationType: NotificationType;
  channel: NotificationChannel;
  isEnabled: boolean;
}
