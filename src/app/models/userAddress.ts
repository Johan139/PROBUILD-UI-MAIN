export interface UserAddress {
  id: number;
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  googlePlaceId: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
