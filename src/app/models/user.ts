import { Portfolio } from './portfolio';

export class User {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  userType!: string;
  isTeamMember?: boolean;
  companyName?: string;
  role?: string;
  inviterId?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
  probuildRating?: number;
  googleRating?: number;
  portfolio?: Portfolio;
  constructionType?: string;
  trade?: string;
  supplierType?: string;
  productsOffered?: string;
  country?: string;
  city?: string;
}
