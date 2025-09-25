export interface Address {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  googlePlaceId?: string;
}

export interface Job {
  jobId: number;
  projectName: string;
  jobType: string;
  status: string;
  address: string;
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  googlePlaceId: string;
  description: string;
  title: string;
  biddingType: string;
  jobPreferences: string;
  trades: string[];
  distance?: number;
  potentialStartDate?: Date;
  potentialEndDate?: Date;
  durationInDays?: number;
  clientName?: string;
  clientCompanyName?: string;
  clientRating?: number;
  numberOfBids?: number;
}
