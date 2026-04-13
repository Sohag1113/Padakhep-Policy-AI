export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

export interface PolicyDocument {
  id: string;
  name: string;
  content: string;
  department: string;
  uploadDate: string; // ISO string
  uploadedBy: string; // User UID
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CompanySettings {
  companyName: string;
  companyShortName: string;
  companyAddress: string;
  companyContact: string;
  companyEmail: string;
  logoUrl: string;
}
