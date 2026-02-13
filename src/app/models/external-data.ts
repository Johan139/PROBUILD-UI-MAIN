export interface ExternalCompany {
  id: number;
  source: string;
  externalId?: string;
  name: string;
  domain?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  industry?: string;
  employeeCount?: number;
  foundedYear?: number;
}

export interface ExternalContact {
  id: number;
  source: string;
  externalId?: string;
  externalCompanyId: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}

export interface ExternalCompanyWithContacts {
  company: ExternalCompany;
  contacts: ExternalContact[];
}

export interface SubcontractorDiscoveryRequest {
  tradePackageId?: number;
  jobId?: number;
  tradeName: string;
  city?: string;
  state?: string;
  radiusMiles?: number;
  limit?: number;
  searchText?: string;
}

export interface GeneralContractorEnrichRequest {
  companyName: string;
  domain?: string;
  jobId?: number;
}

