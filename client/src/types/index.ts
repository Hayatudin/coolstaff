export interface PassportData {
  passportNumber: string;
  surname: string;
  givenNames: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  issuingCountry: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  placeOfBirth: string;
}

export interface WorkExperienceEntry {
  experienceStatus: string;
  country: string;
  yearsOfExperience: string;
}

export interface CandidatePersonalInfo {
  idNumber: string;
  job: string;
  maritalStatus: string;
  numberOfChildren: number;
  religion: string;
  bloodType: string;
  height: string;
  weight: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  educationLevel: string;
  languages: string[];
  workExperience: WorkExperienceEntry[];
  skills: string[];
  medicalStatus: 'Pending' | 'Fit' | 'Unfit' | 'New';
  biometricStatus?: 'Pending' | 'Completed';
  medicalDate?: string;
  biometricDate?: string;
  knownConditions: string;
  additionalPhones: string[];
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  emergencyContactAddress: string;
  cvDeadline?: string;
  cocDocumentUrl?: string;
  medicalDocumentUrl?: string;
  candidateIdImageUrl?: string;
  relativeIdImageUrl?: string;
  labourIdUrl?: string;
  brokerId?: string;
  salary?: string;
}

export interface Candidate {
  id: string;
  shelfId?: string;
  passportData: PassportData;
  personalInfo: CandidatePersonalInfo;
  passportImageUrl: string;
  facePhotoUrl: string;
  fullBodyPhotoUrl: string;
  cocDocumentUrl?: string;
  medicalDocumentUrl?: string;
  candidateIdImageUrl?: string;
  relativeIdImageUrl?: string;
  labourIdUrl?: string;
  isRequested?: boolean;
  visaSelected?: boolean;
  salary?: string;
  visaOrContractNumber?: string | null;
  isFlagged?: boolean;
  videoUrl?: string | null;
  Youtube_URL?: string | null;
  quickVideoUrl?: string | null;
  deployedDate?: string | null;
  registeredAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'visa selected';
  cvDeadline?: string;
  brokerId?: string;
  broker?: Broker;
   latestCVTemplate?: string | null;
  generatedCVs?: ({ id: string; templateId: string; facePhotoUrl?: string; fullBodyPhotoUrl?: string; createdAt?: string } | string)[];
  registeredBy?: string;
  hasInvoice?: boolean;
  isInvoiceDelivered?: boolean;
  visaDate?: string | null;
  cvDownloaded?: boolean;
}

export interface Leader {
  id: string;
  name: string;
  brokers?: Broker[];
  createdAt: string;
  _count?: {
    brokers: number;
  };
  totalCandidates?: number;
}

export interface Broker {
  id: string;
  name: string;
  leaderId?: string | null;
  leader?: Leader | null;
  candidates?: Candidate[];
  _count?: {
    candidates: number;
  };
  isLocked?: boolean;
  createdAt: string;
}

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'classic' | 'modern' | 'professional' | 'minimal' | 'elegant';
}

export type DownloadFormat = 'pdf' | 'doc' | 'jpg';

export type RegistrationStep = 1 | 2;

