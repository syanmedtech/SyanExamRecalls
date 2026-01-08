
import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  Timestamp,
  orderBy,
  increment,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  limit
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { 
  ExamData, 
  StudentAttempt, 
  MCQ, 
  SecuritySettings, 
  RegistrationData, 
  BrandSettings, 
  AdBanner, 
  QuestionStats,
  RecallShare,
  RecallSubmission,
  AppUser,
  UserDashboardBanner,
  UserDashboardSocial,
  SocialCard
} from "../types";

// Refactored to use environment variables for Vercel deployment safety
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC8PgbMGerZbEm72iLXN0ZVV5I3hZTTuW4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "syan-revision-mcqs.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "syan-revision-mcqs",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "syan-revision-mcqs.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "125450072326",
  appId: process.env.FIREBASE_APP_ID || "1:125450072326:web:4ef99ff3e2cb79cbc36e87",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-7CY2RFG4F3"
};

// Singleton initialization pattern with SSR guard
const app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();

// SSR Safety for browser-only services
export const analytics = typeof window !== "undefined" ? firebase.analytics() : null;
export const db = getFirestore(app);
export const auth = firebase.auth();
export const storage = getStorage(app);

// Safe Defaults
export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  logo: { enabled: true, storagePath: null, downloadURL: null },
  watermark: { enabled: false, storagePath: null, downloadURL: null, opacity: 30 },
  voice: { enabled: true, voiceName: 'Kore' },
  ads: { enabled: false, activeAdId: null }
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = { 
  maxViolations: 5, 
  fullscreenRequired: true, 
  focusModeEnabled: true, 
  screenshotRestricted: true, 
  rightClickDisabled: true, 
  devToolsRestricted: true 
};

export const DEFAULT_BANNER_SETTINGS: UserDashboardBanner = {
  enabled: false,
  published: false,
  imageUrl: null,
  imagePath: null,
  buttonText: "Learn More",
  buttonLink: "",
  viewButtonEnabled: true,
  viewButtonText: "View",
  updatedAt: null,
  createdAt: null
};

export const DEFAULT_SOCIAL_SETTINGS: UserDashboardSocial = {
  enabled: true,
  cards: [
    { id: 'facebook', enabled: false, title: 'Facebook Community', subtitle: 'Join the medical group', link: '' },
    { id: 'whatsapp', enabled: false, title: 'WhatsApp Alerts', subtitle: 'Get latest recalls', link: '' },
    { id: 'youtube', enabled: false, title: 'YouTube Lectures', subtitle: 'High-yield clinical review', link: '' }
  ],
  updatedAt: null,
  createdAt: null
};

// --- HELPERS ---
const generateSafeLinkId = (length: number = 12): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const cleanObject = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

const getTimestampMs = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val.toMillis) return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  return 0;
};

async function commitChunkedBatch(items: {ref: any, data: any}[]) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK_SIZE).forEach(item => batch.set(item.ref, item.data));
    await batch.commit();
  }
}

// --- CANONICAL LOADER ---
export const loadQuizQuestions = async (quizId: string): Promise<MCQ[]> => {
  try {
    const subSnap = await getDocs(query(collection(db, "quizzes", quizId, "questions"), orderBy("order")));
    if (!subSnap.empty) return subSnap.docs.map(d => ({ ...d.data(), id: d.id } as MCQ));
  } catch (e) {}
  try {
    const quizDoc = await getDoc(doc(db, "quizzes", quizId));
    if (quizDoc.exists()) {
      const data = quizDoc.data() as ExamData;
      if (data.questions && data.questions.length > 0) return data.questions;
    }
  } catch (e) {}
  return [];
};

export const repairQuizCount = async (quizId: string, actualCount: number) => {
  const quizRef = doc(db, "quizzes", quizId);
  await updateDoc(quizRef, {
    "stats.totalQuestions": actualCount,
    updatedAt: serverTimestamp()
  });
};

// --- USER MANAGEMENT ---
export const isAdminUser = (email: string | null | undefined): boolean => {
  const adminEmail = process.env.ADMIN_EMAIL || "syanmedtechadmen@gmail.com";
  return email?.toLowerCase() === adminEmail.toLowerCase();
};

export const syncUserToFirestore = async (user: firebase.User, displayName?: string, whatsapp?: string): Promise<AppUser> => {
  if (isAdminUser(user.email)) {
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: "Administrator",
      fullName: "Administrator",
      role: 'admin',
      createdAt: Date.now(),
      isBanned: false
    };
  }
  const userRef = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const userData: AppUser = {
        uid: user.uid,
        displayName: displayName || user.displayName || "Dr. Medical Student",
        fullName: displayName || user.displayName || "Dr. Medical Student",
        email: user.email || "",
        whatsapp: whatsapp || "",
        role: "user",
        isActive: true,
        isBanned: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        authProvider: "password",
        dashboardMeta: { lastVisited: null }
      };
      await setDoc(userRef, cleanObject(userData));
      return userData;
    } else {
      const existingData = snap.data() as AppUser;
      const updateData: any = { 
        lastLoginAt: serverTimestamp(),
        email: user.email || existingData.email,
      };
      if (displayName) {
        updateData.displayName = displayName;
        updateData.fullName = displayName;
      }
      if (whatsapp) updateData.whatsapp = whatsapp;
      
      await updateDoc(userRef, updateData);
      return { ...existingData, ...updateData, lastLoginAt: Date.now() };
    }
  } catch (error) {
    return {
      uid: user.uid,
      email: user.email || "",
      displayName: displayName || user.displayName || "Dr. Medical Student",
      fullName: displayName || user.displayName || "Dr. Medical Student",
      role: 'user',
      createdAt: Date.now(),
      isBanned: false
    };
  }
};

export const updateUserProfile = async (uid: string, data: { displayName?: string, whatsapp?: string }) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, cleanObject(data));
  const currentUser = auth.currentUser;
  if (data.displayName && currentUser) {
    await currentUser.updateProfile({ displayName: data.displayName });
  }
};

// --- LOGIN USERS MANAGEMENT ---
export const getLoginUsers = async (): Promise<AppUser[]> => {
  const q = query(collection(db, "users"));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ ...d.data(), uid: d.id } as AppUser))
    .filter(u => !u.deletedAt)
    .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
};

export const subscribeToLoginUsers = (callback: (users: AppUser[]) => void) => {
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snap) => {
    const users = snap.docs
      .map(d => ({ ...d.data(), uid: d.id } as AppUser))
      .filter(u => !u.deletedAt)
      .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
    callback(users);
  });
};

export const setLoginUserBanState = async (uid: string, isBanned: boolean, reason: string | null = null) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    isBanned,
    bannedAt: isBanned ? serverTimestamp() : null,
    bannedReason: isBanned ? reason : null,
    updatedAt: serverTimestamp()
  });
};

export const softDeleteLoginUser = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    deletedAt: serverTimestamp(),
    isBanned: true,
    updatedAt: serverTimestamp()
  });
};

export const bulkUpdateLoginUsers = async (uids: string[], updates: Partial<AppUser>) => {
  const batch = writeBatch(db);
  uids.forEach(uid => {
    const userRef = doc(db, "users", uid);
    batch.update(userRef, { ...updates, updatedAt: serverTimestamp() });
  });
  await batch.commit();
};

export const changeUserPassword = async (currentPassword: string, newPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No authenticated user.");
  
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
  await user.reauthenticateWithCredential(credential);
  await user.updatePassword(newPassword);
};

// --- QUIZ & LINK MANAGEMENT ---
export const ensureQuizPersisted = async (quiz: Partial<ExamData>): Promise<string> => {
  const quizId = quiz.id || doc(collection(db, "quizzes")).id;
  const quizRef = doc(db, "quizzes", quizId);
  const snap = await getDoc(quizRef);
  if (!snap.exists()) {
    return await saveGeminiQuiz({ ...quiz, id: quizId });
  }
  return quizId;
};

export const saveGeminiQuiz = async (quiz: Partial<ExamData>): Promise<string> => {
  const quizId = quiz.id || doc(collection(db, "quizzes")).id;
  const quizRef = doc(db, "quizzes", quizId);
  const now = Date.now();
  const quizPayload: any = {
    ...quiz,
    id: quizId,
    createdAt: quiz.createdAt || now,
    updatedAt: serverTimestamp(),
    status: quiz.status || "draft",
    mode: "gemini_style",
    stats: {
      totalQuestions: quiz.questions?.length || 0,
      totalAttempts: 0
    }
  };
  const { questions, ...mainDoc } = quizPayload;
  await setDoc(quizRef, cleanObject(mainDoc), { merge: true });
  if (questions && questions.length > 0) {
    const questionOps = questions.map((q: any, idx: number) => ({
      ref: doc(collection(db, "quizzes", quizId, "questions"), q.id || `q-${idx}-${now}`),
      data: cleanObject({ ...q, order: idx })
    }));
    await commitChunkedBatch(questionOps);
  }
  return quizId;
};

export const updateLinkValidityAndPublish = async (quizId: string, form: {
  title: string,
  description: string,
  expiresAt: Date | null,
  attemptLimit: number | null,
  linkId?: string | null,
  isActive?: boolean
}) => {
  const quizRef = doc(db, "quizzes", quizId);
  const quizSnap = await getDoc(quizRef);
  if (!quizSnap.exists()) throw new Error("Quiz not found.");

  const quizData = quizSnap.data();
  let activeLinkId = form.linkId || quizData.link?.shareId || quizData.activeLinkId;
  if (!activeLinkId) activeLinkId = generateSafeLinkId(12);

  const expiryTimestamp = form.expiresAt ? Timestamp.fromDate(form.expiresAt) : null;
  const now = serverTimestamp();

  const linkRef = doc(db, "public_links", activeLinkId);
  const linkData = {
    linkId: activeLinkId,
    quizId: quizId,
    quizTitle: form.title,
    description: form.description,
    attemptLimit: form.attemptLimit,
    isActive: form.isActive ?? true,
    expiryAt: expiryTimestamp,
    revokedAt: (form.isActive === false) ? now : null,
    updatedAt: now
  };
  await setDoc(linkRef, cleanObject(linkData), { merge: true });

  await updateDoc(quizRef, {
    title: form.title,
    description: form.description,
    status: "published",
    updatedAt: now,
    activeLinkId: activeLinkId,
    link: { 
      shareId: activeLinkId,
      expiresAt: expiryTimestamp,
      isActive: form.isActive ?? true,
      revokedAt: (form.isActive === false) ? now : null,
      attemptLimit: form.attemptLimit
    }
  });

  return activeLinkId;
};

export const setUserPublishState = async (quizId: string, enabled: boolean, attemptLimit: number | null, title: string, description: string) => {
  const quizRef = doc(db, "quizzes", quizId);
  await updateDoc(quizRef, {
    title,
    description,
    userPublish: {
      enabled,
      publishedAt: enabled ? serverTimestamp() : null,
      attemptLimit
    },
    updatedAt: serverTimestamp()
  });
};

export const getQuizzesForUserDashboard = async (): Promise<ExamData[]> => {
  const q = query(collection(db, "quizzes"), where("userPublish.enabled", "==", true));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as ExamData));
  return data.sort((a, b) => getTimestampMs(b.updatedAt || b.createdAt) - getTimestampMs(a.updatedAt || a.createdAt));
};

export const submitUserAttempt = async (uid: string, attempt: StudentAttempt) => {
  const attemptRef = doc(collection(db, "userAttempts", uid, "attempts"));
  const quizRef = doc(db, "quizzes", attempt.examId);
  const batch = writeBatch(db);
  batch.set(attemptRef, cleanObject({ ...attempt, submittedAt: serverTimestamp(), uid }));
  batch.update(quizRef, { "stats.totalAttempts": increment(1), updatedAt: serverTimestamp() });
  await batch.commit();
};

export const getUserAttempts = async (uid: string, quizId: string) => {
  const q = query(collection(db, "userAttempts", uid, "attempts"), where("examId", "==", quizId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as StudentAttempt);
};

export const createOrUpdateLink = async (quizId: string, settings: any) => {
  const quizSnap = await getDoc(doc(db, "quizzes", quizId));
  const quizData = quizSnap.data();
  return updateLinkValidityAndPublish(quizId, {
    title: quizData?.title || "",
    description: quizData?.description || "",
    expiresAt: settings.expiresAt,
    attemptLimit: settings.attemptLimit,
    linkId: settings.linkId,
    isActive: settings.isActive
  });
};

export const resetShareLink = async (quizId: string, expiresAt: Date | null, attemptLimit: number | null) => {
  const quizRef = doc(db, "quizzes", quizId);
  const snap = await getDoc(quizRef);
  if (!snap.exists()) throw new Error("Quiz not found.");
  const data = snap.data() as ExamData;
  if (data.link?.shareId) await revokeQuizLink(quizId, data.link.shareId);
  return await updateLinkValidityAndPublish(quizId, {
    title: data.title,
    description: data.description || "",
    expiresAt,
    attemptLimit,
    linkId: generateSafeLinkId(12) 
  });
};

export const revokeQuizLink = async (quizId: string, shareId: string) => {
  const now = serverTimestamp();
  const linkRef = doc(db, "public_links", shareId);
  const quizRef = doc(db, "quizzes", quizId);
  await updateDoc(linkRef, { isActive: false, revokedAt: now, updatedAt: now });
  await updateDoc(quizRef, { "link.isActive": false, "link.revokedAt": now, updatedAt: now });
};

export const getQuizByShareId = async (shareId: string): Promise<ExamData | null> => {
  const pLinkSnap = await getDoc(doc(db, "public_links", shareId));
  if (pLinkSnap.exists()) {
    const linkData = pLinkSnap.data();
    if (!linkData.isActive || linkData.revokedAt) return null;
    if (linkData.expiryAt && linkData.expiryAt.toMillis() < Date.now()) return null;
    const quizSnap = await getDoc(doc(db, "quizzes", linkData.quizId));
    if (quizSnap.exists()) {
      const quizData = quizSnap.data();
      const questions = await loadQuizQuestions(linkData.quizId);
      return { 
        ...quizData, 
        id: linkData.quizId, 
        questions, 
        link: {
          shareId,
          isActive: true,
          expiresAt: linkData.expiryAt,
          revokedAt: null,
          attemptLimit: linkData.attemptLimit || null
        }
      } as ExamData;
    }
  }
  return null;
};

export const getAllQuizzes = async (): Promise<ExamData[]> => {
  const q = query(collection(db, "quizzes"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as ExamData));
  return data.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
};

export const deleteQuiz = async (quizId: string) => {
  const questionsSnap = await getDocs(collection(db, "quizzes", quizId, "questions"));
  const batch = writeBatch(db);
  questionsSnap.docs.forEach(qDoc => {
    batch.delete(qDoc.ref);
  });
  batch.delete(doc(db, "quizzes", quizId));
  await batch.commit();
};

export const getGlobalSecurity = async (): Promise<SecuritySettings> => {
  const sDoc = await getDoc(doc(db, "global_security_settings", "main"));
  return sDoc.exists() ? ({ ...DEFAULT_SECURITY_SETTINGS, ...sDoc.data() } as SecuritySettings) : DEFAULT_SECURITY_SETTINGS;
};

export const updateGlobalSecurity = async (settings: SecuritySettings) => {
  const docRef = doc(db, "global_security_settings", "main");
  await setDoc(docRef, settings, { merge: true });
};

export const checkBanStatus = async (email: string): Promise<boolean> => {
  const bDoc = await getDoc(doc(db, "banned_users", btoa(email.toLowerCase())));
  return bDoc.exists();
};

export const banUser = async (email: string) => {
  const emailHash = btoa(email.toLowerCase());
  await setDoc(doc(db, "banned_users", emailHash), { email, bannedAt: serverTimestamp() });
};

export const unbanUser = async (email: string) => {
  const emailHash = btoa(email.toLowerCase());
  await deleteDoc(doc(db, "banned_users", emailHash));
};

export const registerPublicUser = async (quiz: ExamData, data: RegistrationData) => {
  const emailLower = data.email.toLowerCase();
  const emailHash = btoa(emailLower);
  const quizId = quiz.id;
  const userRef = doc(db, "public_exam_users", quizId, "users", emailHash);
  const globalRef = doc(db, "public_exam_users_global", `${quizId}_${emailHash}`);
  const isBanned = await checkBanStatus(data.email);
  const userData = { ...data, email: emailLower, quizId, quizTitle: quiz.title, isBanned, updatedAt: serverTimestamp() };
  const batch = writeBatch(db);
  batch.set(userRef, cleanObject({ ...userData, createdAt: serverTimestamp() }), { merge: true });
  batch.set(globalRef, cleanObject({ ...userData, createdAt: serverTimestamp() }), { merge: true });
  await batch.commit();
};

export const getPublicUsers = async (quizId: string) => {
  const q = query(collection(db, "public_exam_users", quizId, "users"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => d.data());
  return data.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
};

export const getGlobalPublicUsers = async () => {
  const q = query(collection(db, "public_exam_users_global"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => d.data());
  return data.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
};

export const deletePublicUser = async (quizId: string, emailHash: string) => {
  await deleteDoc(doc(db, "public_exam_users", quizId, "users", emailHash));
  await deleteDoc(doc(db, "public_exam_users_global", `${quizId}_${emailHash}`));
};

export const submitGeminiAttempt = async (attempt: StudentAttempt) => {
  const attemptRef = doc(collection(db, "quizzes", attempt.examId, "attempts"));
  const examRef = doc(db, "quizzes", attempt.examId);
  const batch = writeBatch(db);
  batch.set(attemptRef, cleanObject({ ...attempt, submittedAt: serverTimestamp(), status: attempt.status || 'submitted' }));
  if (attempt.status !== 'quit_discarded') batch.update(examRef, { "stats.totalQuestions": increment(1), updatedAt: serverTimestamp() });
  await batch.commit();
};

export const countUserAttempts = async (quizId: string, email: string): Promise<number> => {
  const q = query(collection(db, "quizzes", quizId, "attempts"), where("registrationData.email", "==", email));
  const snap = await getDocs(q);
  return snap.size;
};

export const getLeaderboard = async (quizId: string): Promise<StudentAttempt[]> => {
  const q = query(collection(db, "quizzes", quizId, "attempts"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => d.data() as StudentAttempt);
  return data.sort((a, b) => b.score - a.score || getTimestampMs(b.submittedAt) - getTimestampMs(a.submittedAt));
};

export const logViolation = async (quizId: string, email: string, type: string) => {
  await setDoc(doc(collection(db, "quiz_violations", quizId, "logs")), { email, type, timestamp: serverTimestamp() });
};

export const logQuizEvent = async (quizId: string, event: any) => {
  await setDoc(doc(collection(db, "quiz_events", quizId, "logs")), { ...cleanObject(event), createdAt: serverTimestamp() });
};

export const logSecurityEvent = async (event: any) => {
  await setDoc(doc(collection(db, "security_events")), { ...cleanObject(event), createdAt: serverTimestamp() });
};

export const validateRecallShare = async (shareId: string): Promise<RecallShare | null> => {
  const snap = await getDoc(doc(db, "recalls_share", shareId));
  if (!snap.exists()) return null;
  const d = snap.data() as RecallShare;
  return (!d.revokedAt && (!d.expiresAt || d.expiresAt.toMillis() > Date.now())) ? { ...d, id: snap.id } : null;
};

export const submitRecall = async (submission: any): Promise<void> => {
  const docRef = doc(collection(db, "recallSubmissions"));
  const payload = {
    ...submission,
    id: docRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'submitted'
  };
  await setDoc(docRef, cleanObject(payload));
};

export const getRecallSubmissions = async (examName?: string, timeSlot?: string): Promise<RecallSubmission[]> => {
  let q = query(collection(db, "recallSubmissions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  let subs = snap.docs.map(d => ({ ...d.data(), id: d.id } as RecallSubmission));
  if (examName && examName !== 'all') subs = subs.filter(s => s.examName === examName);
  if (timeSlot && timeSlot !== 'all') subs = subs.filter(s => s.timeSlot === timeSlot);
  return subs;
};

export const deleteRecallSubmission = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "recallSubmissions", id));
};

export const getQuizQuestions = async (quizId: string): Promise<MCQ[]> => {
  return loadQuizQuestions(quizId);
};

export const getQuestionStats = async (quizId: string, questionIds: string[]): Promise<Record<string, QuestionStats>> => {
  const stats: Record<string, QuestionStats> = {};
  questionIds.forEach(id => {
    stats[id] = { totalResponses: 0, optionCounts: {} };
  });
  const attemptsSnap = await getDocs(collection(db, "quizzes", quizId, "attempts"));
  attemptsSnap.docs.forEach(docSnap => {
    const attempt = docSnap.data() as StudentAttempt;
    if (attempt.answers) {
      Object.entries(attempt.answers).forEach(([qId, ansId]) => {
        if (stats[qId]) {
          stats[qId].totalResponses++;
          const val = String(ansId);
          stats[qId].optionCounts[val] = (stats[qId].optionCounts[val] || 0) + 1;
        }
      });
    }
  });
  return stats;
};

export const republishExam = async (quizId: string, minutes: number) => {
  const quizRef = doc(db, "quizzes", quizId);
  const expiresAt = Timestamp.fromMillis(Date.now() + minutes * 60000);
  await updateDoc(quizRef, {
    status: 'published',
    expiresAt,
    publishedAt: serverTimestamp(),
    "link.expiresAt": expiresAt,
    "link.isActive": true,
    "link.revokedAt": null,
    lastUpdateType: null,
    updatedAt: serverTimestamp()
  });
};

export const getPublishedAppendTargets = async (): Promise<ExamData[]> => {
  const q = query(collection(db, "quizzes"), where("status", "==", "published"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as ExamData));
  return data.sort((a, b) => getTimestampMs(b.updatedAt || b.createdAt) - getTimestampMs(a.updatedAt || a.createdAt));
};

export const appendQuestionsToExistingQuiz = async (quizId: string, newQuestions: MCQ[]) => {
  const quizRef = doc(db, "quizzes", quizId);
  const quizSnap = await getDoc(quizRef);
  if (!quizSnap.exists()) throw new Error("Quiz not found.");
  const currentTotal = quizSnap.data().stats?.totalQuestions || 0;
  const questionOps = newQuestions.map((q, idx) => ({
    ref: doc(collection(db, "quizzes", quizId, "questions"), q.id || `q-${Date.now()}-${idx}`),
    data: cleanObject({ ...q, order: currentTotal + idx })
  }));
  await commitChunkedBatch(questionOps);
  await updateDoc(quizRef, {
    "stats.totalQuestions": increment(newQuestions.length),
    lastUpdatedAt: serverTimestamp(),
    lastUpdateType: 'append',
    updatedAt: serverTimestamp()
  });
};

export const saveAd = async (ad: Partial<AdBanner>): Promise<string> => {
  const adRef = ad.id ? doc(db, "advertisements", ad.id) : doc(collection(db, "advertisements"));
  const payload = { ...ad, id: adRef.id, updatedAt: serverTimestamp(), createdAt: ad.createdAt || serverTimestamp() };
  await setDoc(adRef, cleanObject(payload), { merge: true });
  const brandRef = doc(db, "app_brand_settings", "main");
  await updateDoc(brandRef, { "ads.activeAdId": adRef.id });
  return adRef.id;
};
export const getAds = async (): Promise<AdBanner[]> => {
  const q = query(collection(db, "advertisements"));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as AdBanner));
  return data.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
};
export const deleteAd = async (id: string, storagePath: string | null) => {
  await deleteDoc(doc(db, "advertisements", id));
  if (storagePath) { try { await deleteObject(ref(storage, storagePath)); } catch (e) {} }
};
export const getAdById = async (id: string): Promise<AdBanner | null> => {
  const snap = await getDoc(doc(db, "advertisements", id));
  return snap.exists() ? snap.data() as AdBanner : null;
};
export const getBrandSettings = async (): Promise<BrandSettings> => {
  try {
    const docRef = doc(db, "app_brand_settings", "main");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, DEFAULT_BRAND_SETTINGS);
      return DEFAULT_BRAND_SETTINGS;
    }
    return { ...DEFAULT_BRAND_SETTINGS, ...snap.data() } as BrandSettings;
  } catch (err) { return DEFAULT_BRAND_SETTINGS; }
};
export const subscribeToBrandSettings = (callback: (settings: BrandSettings) => void) => {
  const docRef = doc(db, "app_brand_settings", "main");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) callback({ ...DEFAULT_BRAND_SETTINGS, ...snap.data() } as BrandSettings);
    else callback(DEFAULT_BRAND_SETTINGS);
  });
};
export const updateBrandSettings = async (settings: Partial<BrandSettings>) => {
  const docRef = doc(db, "app_brand_settings", "main");
  await updateDoc(docRef, { ...settings, "updatedAt": serverTimestamp() });
};
export const uploadBrandFile = async (path: string, blob: Blob): Promise<{ storagePath: string, downloadURL: string }> => {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: 'image/webp' });
  const downloadURL = await getDownloadURL(fileRef);
  return { storagePath: path, downloadURL };
};
export const deleteBrandFile = async (path: string) => {
  const fileRef = ref(storage, path);
  try { await deleteObject(fileRef); } catch (e) {}
};

// --- USER DASHBOARD BANNER ---
export const getUserDashboardBanner = async (): Promise<UserDashboardBanner> => {
  const docRef = doc(db, "brandSettings", "userDashboardBanner");
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    const initial = { ...DEFAULT_BANNER_SETTINGS, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(docRef, initial);
    return initial as any;
  }
  return { ...DEFAULT_BANNER_SETTINGS, ...snap.data() } as UserDashboardBanner;
};

export const subscribeToUserDashboardBanner = (callback: (banner: UserDashboardBanner) => void) => {
  const docRef = doc(db, "brandSettings", "userDashboardBanner");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) callback({ ...DEFAULT_BANNER_SETTINGS, ...snap.data() } as UserDashboardBanner);
    else callback(DEFAULT_BANNER_SETTINGS);
  });
};

export const saveUserDashboardBanner = async (data: Partial<UserDashboardBanner>) => {
  const docRef = doc(db, "brandSettings", "userDashboardBanner");
  await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

export const deleteUserDashboardBanner = async (imagePath: string | null) => {
  if (imagePath) {
    try { await deleteBrandFile(imagePath); } catch (e) { console.error("Banner Storage Delete Failed", e); }
  }
  await saveUserDashboardBanner({
    imageUrl: null,
    imagePath: null,
    published: false,
    enabled: false,
    buttonText: "Learn More",
    buttonLink: "",
    viewButtonEnabled: true,
    viewButtonText: "View"
  });
};

// --- USER DASHBOARD SOCIAL ---
export const getUserDashboardSocial = async (): Promise<UserDashboardSocial> => {
  const docRef = doc(db, "brandSettings", "userDashboardSocial");
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    const initial = { ...DEFAULT_SOCIAL_SETTINGS, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(docRef, initial);
    return initial as any;
  }
  return snap.data() as UserDashboardSocial;
};

export const subscribeToUserDashboardSocial = (callback: (social: UserDashboardSocial) => void) => {
  const docRef = doc(db, "brandSettings", "userDashboardSocial");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) callback(snap.data() as UserDashboardSocial);
    else callback(DEFAULT_SOCIAL_SETTINGS);
  });
};

export const saveUserDashboardSocial = async (data: Partial<UserDashboardSocial>) => {
  const docRef = doc(db, "brandSettings", "userDashboardSocial");
  await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

export const optimizeImage = (file: File, maxWidth: number, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width; let height = img.height;
        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => { if (blob) resolve(blob); }, "image/webp", quality);
      };
    };
  });
};
export const generateRecallLink = async (expiresAt: Date | null): Promise<string> => {
  const shareId = generateSafeLinkId(12);
  await setDoc(doc(db, "recalls_share", shareId), { isActive: true, expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null, createdAt: serverTimestamp() });
  return shareId;
};
export const revokeRecallLink = async (id: string) => {
  await updateDoc(doc(db, "recalls_share", id), { isActive: false, revokedAt: serverTimestamp() });
};
export const getActiveRecallShare = async (): Promise<RecallShare | null> => {
  const q = query(collection(db, "recalls_share"), where("isActive", "==", true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0].data() as RecallShare;
  return { ...d, id: snap.docs[0].id };
};
