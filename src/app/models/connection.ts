import { User } from './user';

export interface Connection {
  id: string;
  requesterId: string;
  requester?: User;
  receiverId: string;
  receiver?: User;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Date;
  updatedAt: Date;
}
