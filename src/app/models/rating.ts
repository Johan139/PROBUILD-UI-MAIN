export interface Rating {
  id: string;
  jobId: string;
  reviewerId: string;
  ratedUserId: string;
  ratingValue: number;
  reviewText: string;
  createdAt: Date;
}
