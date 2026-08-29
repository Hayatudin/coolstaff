import {
  mysqlTable,
  varchar,
  boolean,
  datetime,
  int,
  json,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { relations, sql } from 'drizzle-orm';

import crypto from 'crypto';

export const generateId = () => 'c' + crypto.randomBytes(12).toString('hex');

// ── Broker ─────────────────────────────────────────────────────────────────
export const broker = mysqlTable('Broker', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isLocked: boolean('isLocked').notNull().default(false),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  leaderId: varchar('leaderId', { length: 255 }),
});

export const brokerRelations = relations(broker, ({ one, many }) => ({
  leader: one(leader, {
    fields: [broker.leaderId],
    references: [leader.id],
  }),
  candidates: many(candidate),
  quickRegistrations: many(quickRegistration),
}));

// ── Leader ─────────────────────────────────────────────────────────────────
export const leader = mysqlTable('Leader', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const leaderRelations = relations(leader, ({ many }) => ({
  brokers: many(broker),
}));

// ── Candidate ──────────────────────────────────────────────────────────────
export const candidate = mysqlTable('Candidate', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  shelfId: varchar('shelfId', { length: 255 }),
  passportNumber: varchar('passportNumber', { length: 255 }).notNull().unique(),
  surname: varchar('surname', { length: 255 }).notNull(),
  givenNames: varchar('givenNames', { length: 255 }).notNull(),
  dateOfBirth: datetime('dateOfBirth').notNull(),
  gender: varchar('gender', { length: 255 }).notNull(),
  nationality: varchar('nationality', { length: 255 }).notNull(),
  issuingCountry: varchar('issuingCountry', { length: 255 }).notNull(),
  dateOfIssue: datetime('dateOfIssue').notNull(),
  dateOfExpiry: datetime('dateOfExpiry').notNull(),
  placeOfBirth: varchar('placeOfBirth', { length: 255 }).notNull(),
  maritalStatus: varchar('maritalStatus', { length: 255 }).notNull(),
  numberOfChildren: int('numberOfChildren').notNull().default(0),
  religion: varchar('religion', { length: 255 }).notNull(),
  bloodType: varchar('bloodType', { length: 255 }).notNull(),
  height: varchar('height', { length: 255 }),
  weight: varchar('weight', { length: 255 }),
  phone: varchar('phone', { length: 255 }),
  additionalPhones: json('additionalPhones'),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 255 }),
  city: varchar('city', { length: 255 }),
  state: varchar('state', { length: 255 }),
  country: varchar('country', { length: 255 }),
  idNumber: varchar('idNumber', { length: 255 }),
  job: varchar('job', { length: 255 }),
  educationLevel: varchar('educationLevel', { length: 255 }),
  languages: json('languages'),
  workExperience: json('workExperience'),
  skills: json('skills'),
  medicalStatus: varchar('medicalStatus', { length: 255 }).notNull().default('Pending'),
  biometricStatus: varchar('biometricStatus', { length: 255 }).notNull().default('Pending'),
  medicalDate: datetime('medicalDate'),
  biometricDate: datetime('biometricDate'),
  knownConditions: text('knownConditions'),
  cvDeadline: datetime('cvDeadline'),
  emergencyContactName: varchar('emergencyContactName', { length: 255 }),
  emergencyContactRelation: varchar('emergencyContactRelation', { length: 255 }),
  emergencyContactPhone: varchar('emergencyContactPhone', { length: 255 }),
  emergencyContactAddress: text('emergencyContactAddress'),
  passportImageUrl: text('passportImageUrl'),
  facePhotoUrl: text('facePhotoUrl'),
  fullBodyPhotoUrl: text('fullBodyPhotoUrl'),
  cocDocumentUrl: text('cocDocumentUrl'),
  medicalDocumentUrl: text('medicalDocumentUrl'),
  candidateIdImageUrl: text('candidateIdImageUrl'),
  relativeIdImageUrl: text('relativeIdImageUrl'),
  labourIdUrl: text('labourIdUrl'),
  isRequested: boolean('isRequested').notNull().default(false),
  visaOrContractNumber: varchar('visaOrContractNumber', { length: 255 }),
  isFlagged: boolean('isFlagged').notNull().default(false),
  flaggedAt: datetime('flaggedAt'),
  videoUrl: text('Youtube_URL'),
  quickVideoUrl: text('quickVideoUrl'),
  registeredAt: datetime('registeredAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  status: varchar('status', { length: 255 }).notNull().default('pending'),
  visaSelected: boolean('visaSelected').notNull().default(false),
  visaDate: datetime('visaDate'),
  salary: varchar('salary', { length: 255 }).default('1000SR'),
  agency: varchar('agency', { length: 255 }).default('daera'),
  deployedDate: datetime('deployedDate'),
  isLocked: boolean('isLocked').notNull().default(false),
  cvDownloaded: boolean('cvDownloaded').notNull().default(false),
  allowVideo: boolean('allowVideo').notNull().default(false),
  embassyIssue: varchar('embassyIssue', { length: 255 }).notNull().default('No'),
  cocStatus: varchar('cocStatus', { length: 255 }).notNull().default('No'),
  tasheerStatus: varchar('tasheerStatus', { length: 255 }).notNull().default('No'),
  wakalaStatus: varchar('wakalaStatus', { length: 255 }).notNull().default('Unpaid'),
  qrCodeStatus: varchar('qrCodeStatus', { length: 255 }).notNull().default('No'),
  selectedType: varchar('selectedType', { length: 255 }).notNull().default('Private'),
  price: varchar('price', { length: 255 }),
  travelDate: datetime('travelDate'),
  agencyStatus: varchar('agencyStatus', { length: 255 }).notNull().default('Under Process'),
  agencySelected: boolean('agencySelected').notNull().default(false),
  laborID: varchar('laborID', { length: 255 }),
  brokerId: varchar('brokerId', { length: 255 }),
  registeredById: varchar('registeredById', { length: 255 }),
}, (table) => ({
  passportNumberIdx: index('passportNumber_idx').on(table.passportNumber),
  nationalityIdx: index('nationality_idx').on(table.nationality),
}));

export const candidateRelations = relations(candidate, ({ one, many }) => ({
  broker: one(broker, {
    fields: [candidate.brokerId],
    references: [broker.id],
  }),
  registeredBy: one(user, {
    fields: [candidate.registeredById],
    references: [user.id],
  }),
  generatedCVs: many(generatedCv),
  invoices: many(invoice),
}));

// ── GeneratedCV ─────────────────────────────────────────────────────────────
export const generatedCv = mysqlTable('GeneratedCV', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  candidateId: varchar('candidateId', { length: 255 }).notNull(),
  templateId: varchar('templateId', { length: 255 }).notNull(),
  facePhotoUrl: text('facePhotoUrl'),
  fullBodyPhotoUrl: text('fullBodyPhotoUrl'),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  templateIdIdx: index('templateId_idx').on(table.templateId),
  candidateIdIdx: index('candidateId_idx').on(table.candidateId),
}));

export const generatedCvRelations = relations(generatedCv, ({ one }) => ({
  candidate: one(candidate, {
    fields: [generatedCv.candidateId],
    references: [candidate.id],
  }),
}));

// ── Notification ────────────────────────────────────────────────────────────
export const notification = mysqlTable('Notification', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('isRead').notNull().default(false),
  candidateId: varchar('candidateId', { length: 255 }),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  createdAtIdx: index('createdAt_idx').on(table.createdAt),
  isReadIdx: index('isRead_idx').on(table.isRead),
}));

// ── User (Better Auth) ──────────────────────────────────────────────────────
export const user = mysqlTable('User', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: varchar('role', { length: 255 }).notNull().default('user'),
  agency: varchar('agency', { length: 255 }),
  majorAgency: varchar('majorAgency', { length: 255 }),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  roleIdx: index('role_idx').on(table.role),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  candidates: many(candidate),
  quickRegistrations: many(quickRegistration),
}));

// ── Session (Better Auth) ───────────────────────────────────────────────────
export const session = mysqlTable('Session', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  expiresAt: datetime('expiresAt').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: varchar('ipAddress', { length: 255 }),
  userAgent: text('userAgent'),
  userId: varchar('userId', { length: 255 }).notNull(),
}, (table) => ({
  tokenIdx: index('token_idx').on(table.token),
  userIdIdx: index('userId_idx').on(table.userId),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

// ── Account (Better Auth) ───────────────────────────────────────────────────
export const account = mysqlTable('Account', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  accountId: varchar('accountId', { length: 255 }).notNull(),
  providerId: varchar('providerId', { length: 255 }).notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: datetime('accessTokenExpiresAt'),
  refreshTokenExpiresAt: datetime('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  userId: varchar('userId', { length: 255 }).notNull(),
}, (table) => ({
  userIdIdx: index('userId_idx').on(table.userId),
  providerAccountIdx: index('provider_account_idx').on(table.providerId, table.accountId),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ── Verification (Better Auth) ──────────────────────────────────────────────
export const verification = mysqlTable('Verification', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: text('value').notNull(),
  expiresAt: datetime('expiresAt').notNull(),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  identifierIdx: index('identifier_idx').on(table.identifier),
}));

// ── QuickRegistration ───────────────────────────────────────────────────────
export const quickRegistration = mysqlTable('QuickRegistration', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  passportNumber: varchar('passportNumber', { length: 255 }).notNull(),
  passportType: varchar('passportType', { length: 255 }).default('original'),
  surname: varchar('surname', { length: 255 }).notNull(),
  givenNames: varchar('givenNames', { length: 255 }).notNull(),
  dateOfBirth: varchar('dateOfBirth', { length: 255 }),
  gender: varchar('gender', { length: 255 }),
  nationality: varchar('nationality', { length: 255 }),
  dateOfExpiry: varchar('dateOfExpiry', { length: 255 }),
  issuingCountry: varchar('issuingCountry', { length: 255 }),
  placeOfBirth: varchar('placeOfBirth', { length: 255 }),
  educationLevel: varchar('educationLevel', { length: 255 }),
  jobExperience: text('jobExperience'),
  maritalStatus: varchar('maritalStatus', { length: 255 }),
  numberOfChildren: int('numberOfChildren').notNull().default(0),
  passportImageUrl: text('passportImageUrl'),
  religion: varchar('religion', { length: 255 }),
  relativePhones: json('relativePhones'),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  verificationStatus: varchar('verificationStatus', { length: 255 }).notNull().default('pending'),
  musanedCvUrl: text('musanedCvUrl'),
  verificationNotes: text('verificationNotes'),
  verifiedAt: datetime('verifiedAt'),
  promotedAt: datetime('promotedAt'),
  promotedCandidateId: varchar('promotedCandidateId', { length: 255 }),
  cocDocumentUrl: text('cocDocumentUrl'),
  labourIdUrl: text('labourIdUrl'),
  candidateIdImageUrl: text('candidateIdImageUrl'),
  relativeIdImageUrl: text('relativeIdImageUrl'),
  agency: varchar('agency', { length: 255 }).default('daera'),
  videoUrl: varchar('videoUrl', { length: 500 }),
  languages: json('languages'),
  allowVideo: boolean('allowVideo').notNull().default(false),
  laborID: varchar('laborID', { length: 255 }),
  brokerId: varchar('brokerId', { length: 255 }),
  registeredById: varchar('registeredById', { length: 255 }),
}, (table) => ({
  createdAtIdx: index('createdAt_idx').on(table.createdAt),
  brokerIdIdx: index('brokerId_idx').on(table.brokerId),
  registeredByIdIdx: index('registeredById_idx').on(table.registeredById),
}));

export const quickRegistrationRelations = relations(quickRegistration, ({ one }) => ({
  broker: one(broker, {
    fields: [quickRegistration.brokerId],
    references: [broker.id],
  }),
  registeredBy: one(user, {
    fields: [quickRegistration.registeredById],
    references: [user.id],
  }),
}));

// ── Invoice ─────────────────────────────────────────────────────────────────
export const invoice = mysqlTable('Invoice', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  candidateId: varchar('candidateId', { length: 255 }).notNull(),
  lmisQrCodeUrl: text('lmisQrCodeUrl').notNull(),
  insuranceUrl: text('insuranceUrl').notNull(),
  ticketUrl: text('ticketUrl').notNull(),
  price: varchar('price', { length: 255 }).notNull(),
  isDelivered: boolean('isDelivered').notNull().default(false),
  deployedDate: datetime('deployedDate'),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  candidateIdIdx: index('candidateId_idx').on(table.candidateId),
}));

export const invoiceRelations = relations(invoice, ({ one }) => ({
  candidate: one(candidate, {
    fields: [invoice.candidateId],
    references: [candidate.id],
  }),
}));

// ── PreRegisteredVideo ──────────────────────────────────────────────────────
export const preRegisteredVideo = mysqlTable('PreRegisteredVideo', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  passportNumber: varchar('passportNumber', { length: 255 }).notNull().unique(),
  videoUrl: text('videoUrl').notNull(),
  facePhotoUrl: text('facePhotoUrl'),
  fullBodyPhotoUrl: text('fullBodyPhotoUrl'),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Passport ────────────────────────────────────────────────────────────────
export const passport = mysqlTable('Passport', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => generateId()),
  shelfNo: varchar('shelfNo', { length: 255 }).notNull(),
  fullName: varchar('fullName', { length: 255 }).notNull(),
  passportNumber: varchar('passportNumber', { length: 255 }).notNull().unique(),
  passportImageUrl: text('passportImageUrl'),
  status: varchar('status', { length: 255 }).notNull().default('Available'),
  takenReason: text('takenReason'),
  takenByName: varchar('takenByName', { length: 255 }),
  takenByPhone: varchar('takenByPhone', { length: 255 }),
  createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  passportNumberIdx: index('passportNumber_idx').on(table.passportNumber),
  statusIdx: index('status_idx').on(table.status),
}));
