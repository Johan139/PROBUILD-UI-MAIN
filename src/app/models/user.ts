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
}
