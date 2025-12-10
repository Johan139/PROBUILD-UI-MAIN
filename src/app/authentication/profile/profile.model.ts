export class AppModule {}

export interface Profile {
  id: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  userType: string | null;
  companyName: string | null;
  companyRegNo: string | null;
  vatNo: string | null;
  constructionType: string | null;
  nrEmployees: string | null;
  yearsOfOperation: string | null;
  certificationStatus: string | null;
  certificationDocumentPath: string | null;
  availability: string | null;
  trade: string | null;
  supplierType: string | null;
  productsOffered: string | null;
  projectPreferences: string | null;
  deliveryArea: string | null;
  deliveryTime: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  subscriptionPackage: string | null;
  isVerified: boolean;
  userAddresses?: UserAddress[];
  countryNumberCode: string ;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  status: string;
}

export interface Document {
  name: string;
  type: string;
  path: string;
  uploadedDate: Date;
}
export interface ProfileDocument {
  id: number;
  userId: string;
  fileName: string;
  size: number;
  blobUrl: string;
}

export interface UserAddress {
  id: number;
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: any | null;
  longitude?: any | null;
  formattedAddress: string;
  googlePlaceId: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  countryCode: string;
  addressType?: string;
}

export interface AddressType{
  id: string;
  name: string;
  description: string; 
  isdefault: number;
  displayorder: number;
}

