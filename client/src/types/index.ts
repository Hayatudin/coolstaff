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
  medicalStatus: 'Pending' | 'Fit' | 'Unfit';
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
  registeredAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'visa selected';
  cvDeadline?: string;
  brokerId?: string;
  broker?: Broker;
  latestCVTemplate?: string | null;
  generatedCVs?: string[];
}

export interface Broker {
  id: string;
  name: string;
  candidates?: Candidate[];
  _count?: {
    candidates: number;
  };
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

