
export type Difficulty = 'Easy' | 'Medium' | 'Difficult' | 'easy' | 'medium' | 'hard';
export type ExamType = 'USMLE' | 'FCPS' | 'MRCP' | 'PLAB' | 'HAAD' | 'AMC' | 'MBBS' | 'SMLE';
export type MCQType = 'Simple' | 'Clinical' | 'Case-based' | 'Mixed';

// Added missing ExamConfig interface
export interface ExamConfig {
  sourceText?: string;
  sourceFile?: File;
  sourceMimeType?: string;
  selectedExamTypes: ExamType[];
  selectedMCQType: MCQType;
  adminPrompt?: string;
}

export interface MCQ {
  id: string;
  examId?: string;
  question: string;
  stem?: string;
  options: string[] | { id: string, text: string }[];
  correctAnswerIndex?: number;
  correctOptionId?: string;
  explanation: string;
  keyNotes?: string[];
  reference?: string;
  hint?: string | null;
  difficulty: Difficulty;
  index?: number; // Sequential index in published exams
  sourceBatchId?: string;
}

export interface SecuritySettings {
  maxViolations: number;
  fullscreenRequired: boolean;
  focusModeEnabled: boolean;
  screenshotRestricted: boolean;
  rightClickDisabled: boolean;
  devToolsRestricted: boolean;
}

export interface RegistrationData {
  fullName: string;
  whatsapp: string;
  email: string;
  college: string;
  status: 'Student' | 'HO' | 'PG' | 'MO' | 'Registrar';
  examPreparingFor: string;
}

export interface QuizLink {
  shareId: string | null;
  expiresAt: any | null;
  revokedAt: any | null;
  isActive: boolean;
  attemptLimit: number | null;
}

export interface ExamData {
  id: string;
  title: string;
  description?: string;
  name?: string;
  createdAt: number;
  publishedAt?: any;
  expiresAt?: any;
  lastUpdatedAt?: any;
  lastUpdateType?: 'append' | null;
  availableMinutes?: number;
  status: 'active' | 'expired' | 'draft' | 'published' | 'revoked';
  config: ExamConfig;
  questions: MCQ[];
  durationMinutes: number;
  mode?: 'gemini_style' | 'classic';
  link?: QuizLink;
  userPublish?: {
    enabled: boolean;
    publishedAt: any | null;
    attemptLimit: number | null;
  };
  stats?: {
    totalQuestions: number;
    totalAttempts: number;
  };
  isPublishedExam?: boolean; // Marker for new entity
}

export interface StudentAttempt {
  studentId: string;
  studentName: string;
  examId: string;
  shareId?: string;
  registrationData?: RegistrationData;
  answers: Record<string, any>;
  score: number;
  totalQuestions: number;
  completedAt: number;
  submittedAt?: any;
  timeTakenSeconds?: number;
  correct?: number;
  wrong?: number;
  scorePercent?: number;
  percentage?: number; 
  violations?: number;
  status?: 'in_progress' | 'submitted' | 'quit_submitted' | 'quit_discarded';
  questionIdsSnapshot?: string[]; // Snapshot for consistency
}

export interface QuestionStats {
  totalResponses: number;
  optionCounts: Record<string | number, number>;
}

export interface BrandAsset {
  enabled: boolean;
  storagePath: string | null;
  downloadURL: string | null;
  updatedAt?: any;
  opacity?: number;
}

export interface AdBanner {
  id: string;
  status: 'active' | 'inactive';
  banner: {
    storagePath: string | null;
    downloadURL: string | null;
    variants?: {
      smallURL?: string;
      mediumURL?: string;
      largeURL?: string;
    };
  };
  timing: {
    closeButtonAfterSeconds: number;
    showPopupAfterSeconds: number;
  };
  ctaButton: {
    text: string;
    link: string;
  };
  createdAt?: any;
  updatedAt?: any;
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface BrandSettings {
  logo: BrandAsset;
  watermark: BrandAsset;
  voice: {
    enabled: boolean;
    voiceName: VoiceName;
  };
  ads: {
    enabled: boolean;
    activeAdId: string | null;
    updatedAt?: any;
  };
}

export interface UserDashboardBanner {
  enabled: boolean;
  published: boolean;
  imageUrl: string | null;
  imagePath: string | null;
  buttonText: string;
  buttonLink: string;
  viewButtonEnabled: boolean;
  viewButtonText: string;
  updatedAt: any;
  createdAt: any;
}

export interface SocialCard {
  id: 'facebook' | 'whatsapp' | 'youtube';
  enabled: boolean;
  title: string;
  subtitle: string;
  link: string;
}

export interface UserDashboardSocial {
  enabled: boolean;
  cards: SocialCard[];
  updatedAt: any;
  createdAt: any;
}

export interface RecallSubmission {
  id: string;
  shareId: string;
  name: string;
  examName: string;
  timeSlot: 'Morning' | 'Evening';
  points: string[];
  pointsCount: number;
  createdAt: any;
  status: 'submitted';
}

export interface RecallShare {
  id: string;
  isActive: boolean;
  expiresAt: any | null;
  revokedAt: any | null;
  createdAt: any;
  updatedAt: any;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  fullName?: string; // New field to match signup
  whatsapp?: string;
  role: 'admin' | 'user';
  createdAt: any;
  lastLoginAt?: any;
  isActive?: boolean;
  isBanned?: boolean; // New field
  bannedAt?: any; // New field
  bannedReason?: string | null; // New field
  deletedAt?: any; // New field for soft delete
  authProvider?: string;
  dashboardMeta?: {
    lastVisited: any | null;
  };
}
