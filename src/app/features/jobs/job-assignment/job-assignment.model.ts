export interface JobAssignment {
  id: number;
  projectName?: string;
  jobType?: string;
  address?: string;
  stories?: number;
  buildingSize?: number;
  status?: string;
  jobUser: JobUser[];
}

export interface JobAssignmentLink {
  userId: string;
  jobId: number;
  jobRole: string;
}

export interface JobUser {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  userType?: string;
  jobRole?: string;
}