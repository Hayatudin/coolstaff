"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passport = exports.preRegisteredVideo = exports.invoiceRelations = exports.invoice = exports.quickRegistrationRelations = exports.quickRegistration = exports.verification = exports.accountRelations = exports.account = exports.sessionRelations = exports.session = exports.userRelations = exports.user = exports.notification = exports.generatedCvRelations = exports.generatedCv = exports.candidateRelations = exports.candidate = exports.leaderRelations = exports.leader = exports.brokerRelations = exports.broker = exports.generateId = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
const generateId = () => 'c' + crypto_1.default.randomBytes(12).toString('hex');
exports.generateId = generateId;
// ── Broker ─────────────────────────────────────────────────────────────────
exports.broker = (0, mysql_core_1.mysqlTable)('Broker', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull().unique(),
    isLocked: (0, mysql_core_1.boolean)('isLocked').notNull().default(false),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    leaderId: (0, mysql_core_1.varchar)('leaderId', { length: 255 }),
});
exports.brokerRelations = (0, drizzle_orm_1.relations)(exports.broker, ({ one, many }) => ({
    leader: one(exports.leader, {
        fields: [exports.broker.leaderId],
        references: [exports.leader.id],
    }),
    candidates: many(exports.candidate),
    quickRegistrations: many(exports.quickRegistration),
}));
// ── Leader ─────────────────────────────────────────────────────────────────
exports.leader = (0, mysql_core_1.mysqlTable)('Leader', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull().unique(),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
exports.leaderRelations = (0, drizzle_orm_1.relations)(exports.leader, ({ many }) => ({
    brokers: many(exports.broker),
}));
// ── Candidate ──────────────────────────────────────────────────────────────
exports.candidate = (0, mysql_core_1.mysqlTable)('Candidate', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    shelfId: (0, mysql_core_1.varchar)('shelfId', { length: 255 }),
    passportNumber: (0, mysql_core_1.varchar)('passportNumber', { length: 255 }).notNull().unique(),
    surname: (0, mysql_core_1.varchar)('surname', { length: 255 }).notNull(),
    givenNames: (0, mysql_core_1.varchar)('givenNames', { length: 255 }).notNull(),
    dateOfBirth: (0, mysql_core_1.datetime)('dateOfBirth').notNull(),
    gender: (0, mysql_core_1.varchar)('gender', { length: 255 }).notNull(),
    nationality: (0, mysql_core_1.varchar)('nationality', { length: 255 }).notNull(),
    issuingCountry: (0, mysql_core_1.varchar)('issuingCountry', { length: 255 }).notNull(),
    dateOfIssue: (0, mysql_core_1.datetime)('dateOfIssue').notNull(),
    dateOfExpiry: (0, mysql_core_1.datetime)('dateOfExpiry').notNull(),
    placeOfBirth: (0, mysql_core_1.varchar)('placeOfBirth', { length: 255 }).notNull(),
    maritalStatus: (0, mysql_core_1.varchar)('maritalStatus', { length: 255 }).notNull(),
    numberOfChildren: (0, mysql_core_1.int)('numberOfChildren').notNull().default(0),
    religion: (0, mysql_core_1.varchar)('religion', { length: 255 }).notNull(),
    bloodType: (0, mysql_core_1.varchar)('bloodType', { length: 255 }).notNull(),
    height: (0, mysql_core_1.varchar)('height', { length: 255 }),
    weight: (0, mysql_core_1.varchar)('weight', { length: 255 }),
    phone: (0, mysql_core_1.varchar)('phone', { length: 255 }),
    additionalPhones: (0, mysql_core_1.json)('additionalPhones'),
    email: (0, mysql_core_1.varchar)('email', { length: 255 }),
    address: (0, mysql_core_1.varchar)('address', { length: 255 }),
    city: (0, mysql_core_1.varchar)('city', { length: 255 }),
    state: (0, mysql_core_1.varchar)('state', { length: 255 }),
    country: (0, mysql_core_1.varchar)('country', { length: 255 }),
    idNumber: (0, mysql_core_1.varchar)('idNumber', { length: 255 }),
    job: (0, mysql_core_1.varchar)('job', { length: 255 }),
    educationLevel: (0, mysql_core_1.varchar)('educationLevel', { length: 255 }),
    languages: (0, mysql_core_1.json)('languages'),
    workExperience: (0, mysql_core_1.json)('workExperience'),
    skills: (0, mysql_core_1.json)('skills'),
    medicalStatus: (0, mysql_core_1.varchar)('medicalStatus', { length: 255 }).notNull().default('Pending'),
    biometricStatus: (0, mysql_core_1.varchar)('biometricStatus', { length: 255 }).notNull().default('Pending'),
    medicalDate: (0, mysql_core_1.datetime)('medicalDate'),
    biometricDate: (0, mysql_core_1.datetime)('biometricDate'),
    knownConditions: (0, mysql_core_1.text)('knownConditions'),
    cvDeadline: (0, mysql_core_1.datetime)('cvDeadline'),
    emergencyContactName: (0, mysql_core_1.varchar)('emergencyContactName', { length: 255 }),
    emergencyContactRelation: (0, mysql_core_1.varchar)('emergencyContactRelation', { length: 255 }),
    emergencyContactPhone: (0, mysql_core_1.varchar)('emergencyContactPhone', { length: 255 }),
    emergencyContactAddress: (0, mysql_core_1.text)('emergencyContactAddress'),
    passportImageUrl: (0, mysql_core_1.text)('passportImageUrl'),
    facePhotoUrl: (0, mysql_core_1.text)('facePhotoUrl'),
    fullBodyPhotoUrl: (0, mysql_core_1.text)('fullBodyPhotoUrl'),
    cocDocumentUrl: (0, mysql_core_1.text)('cocDocumentUrl'),
    medicalDocumentUrl: (0, mysql_core_1.text)('medicalDocumentUrl'),
    candidateIdImageUrl: (0, mysql_core_1.text)('candidateIdImageUrl'),
    relativeIdImageUrl: (0, mysql_core_1.text)('relativeIdImageUrl'),
    labourIdUrl: (0, mysql_core_1.text)('labourIdUrl'),
    isRequested: (0, mysql_core_1.boolean)('isRequested').notNull().default(false),
    visaOrContractNumber: (0, mysql_core_1.varchar)('visaOrContractNumber', { length: 255 }),
    isFlagged: (0, mysql_core_1.boolean)('isFlagged').notNull().default(false),
    flaggedAt: (0, mysql_core_1.datetime)('flaggedAt'),
    videoUrl: (0, mysql_core_1.text)('Youtube_URL'),
    quickVideoUrl: (0, mysql_core_1.text)('quickVideoUrl'),
    registeredAt: (0, mysql_core_1.datetime)('registeredAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    status: (0, mysql_core_1.varchar)('status', { length: 255 }).notNull().default('pending'),
    visaSelected: (0, mysql_core_1.boolean)('visaSelected').notNull().default(false),
    visaDate: (0, mysql_core_1.datetime)('visaDate'),
    salary: (0, mysql_core_1.varchar)('salary', { length: 255 }).default('1000SR'),
    agency: (0, mysql_core_1.varchar)('agency', { length: 255 }).default('daera'),
    deployedDate: (0, mysql_core_1.datetime)('deployedDate'),
    isLocked: (0, mysql_core_1.boolean)('isLocked').notNull().default(false),
    cvDownloaded: (0, mysql_core_1.boolean)('cvDownloaded').notNull().default(false),
    allowVideo: (0, mysql_core_1.boolean)('allowVideo').notNull().default(false),
    embassyIssue: (0, mysql_core_1.varchar)('embassyIssue', { length: 255 }).notNull().default('No'),
    cocStatus: (0, mysql_core_1.varchar)('cocStatus', { length: 255 }).notNull().default('No'),
    tasheerStatus: (0, mysql_core_1.varchar)('tasheerStatus', { length: 255 }).notNull().default('No'),
    wakalaStatus: (0, mysql_core_1.varchar)('wakalaStatus', { length: 255 }).notNull().default('Unpaid'),
    qrCodeStatus: (0, mysql_core_1.varchar)('qrCodeStatus', { length: 255 }).notNull().default('No'),
    selectedType: (0, mysql_core_1.varchar)('selectedType', { length: 255 }).notNull().default('Private'),
    price: (0, mysql_core_1.varchar)('price', { length: 255 }),
    travelDate: (0, mysql_core_1.datetime)('travelDate'),
    agencyStatus: (0, mysql_core_1.varchar)('agencyStatus', { length: 255 }).notNull().default('Under Process'),
    agencySelected: (0, mysql_core_1.boolean)('agencySelected').notNull().default(false),
    laborID: (0, mysql_core_1.varchar)('laborID', { length: 255 }),
    brokerId: (0, mysql_core_1.varchar)('brokerId', { length: 255 }),
    registeredById: (0, mysql_core_1.varchar)('registeredById', { length: 255 }),
}, (table) => ({
    passportNumberIdx: (0, mysql_core_1.index)('passportNumber_idx').on(table.passportNumber),
    nationalityIdx: (0, mysql_core_1.index)('nationality_idx').on(table.nationality),
}));
exports.candidateRelations = (0, drizzle_orm_1.relations)(exports.candidate, ({ one, many }) => ({
    broker: one(exports.broker, {
        fields: [exports.candidate.brokerId],
        references: [exports.broker.id],
    }),
    registeredBy: one(exports.user, {
        fields: [exports.candidate.registeredById],
        references: [exports.user.id],
    }),
    generatedCVs: many(exports.generatedCv),
    invoices: many(exports.invoice),
}));
// ── GeneratedCV ─────────────────────────────────────────────────────────────
exports.generatedCv = (0, mysql_core_1.mysqlTable)('GeneratedCV', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    candidateId: (0, mysql_core_1.varchar)('candidateId', { length: 255 }).notNull(),
    templateId: (0, mysql_core_1.varchar)('templateId', { length: 255 }).notNull(),
    facePhotoUrl: (0, mysql_core_1.text)('facePhotoUrl'),
    fullBodyPhotoUrl: (0, mysql_core_1.text)('fullBodyPhotoUrl'),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)('updatedAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => ({
    templateIdIdx: (0, mysql_core_1.index)('templateId_idx').on(table.templateId),
    candidateIdIdx: (0, mysql_core_1.index)('candidateId_idx').on(table.candidateId),
}));
exports.generatedCvRelations = (0, drizzle_orm_1.relations)(exports.generatedCv, ({ one }) => ({
    candidate: one(exports.candidate, {
        fields: [exports.generatedCv.candidateId],
        references: [exports.candidate.id],
    }),
}));
// ── Notification ────────────────────────────────────────────────────────────
exports.notification = (0, mysql_core_1.mysqlTable)('Notification', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    title: (0, mysql_core_1.varchar)('title', { length: 255 }).notNull(),
    message: (0, mysql_core_1.text)('message').notNull(),
    isRead: (0, mysql_core_1.boolean)('isRead').notNull().default(false),
    candidateId: (0, mysql_core_1.varchar)('candidateId', { length: 255 }),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => ({
    createdAtIdx: (0, mysql_core_1.index)('createdAt_idx').on(table.createdAt),
    isReadIdx: (0, mysql_core_1.index)('isRead_idx').on(table.isRead),
}));
// ── User (Better Auth) ──────────────────────────────────────────────────────
exports.user = (0, mysql_core_1.mysqlTable)('User', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    name: (0, mysql_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    emailVerified: (0, mysql_core_1.boolean)('emailVerified').notNull().default(false),
    image: (0, mysql_core_1.text)('image'),
    role: (0, mysql_core_1.varchar)('role', { length: 255 }).notNull().default('user'),
    agency: (0, mysql_core_1.varchar)('agency', { length: 255 }),
    majorAgency: (0, mysql_core_1.varchar)('majorAgency', { length: 255 }),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)('updatedAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => ({
    emailIdx: (0, mysql_core_1.index)('email_idx').on(table.email),
    roleIdx: (0, mysql_core_1.index)('role_idx').on(table.role),
}));
exports.userRelations = (0, drizzle_orm_1.relations)(exports.user, ({ many }) => ({
    sessions: many(exports.session),
    accounts: many(exports.account),
    candidates: many(exports.candidate),
    quickRegistrations: many(exports.quickRegistration),
}));
// ── Session (Better Auth) ───────────────────────────────────────────────────
exports.session = (0, mysql_core_1.mysqlTable)('Session', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    expiresAt: (0, mysql_core_1.datetime)('expiresAt').notNull(),
    token: (0, mysql_core_1.varchar)('token', { length: 255 }).notNull().unique(),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)('updatedAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    ipAddress: (0, mysql_core_1.varchar)('ipAddress', { length: 255 }),
    userAgent: (0, mysql_core_1.text)('userAgent'),
    userId: (0, mysql_core_1.varchar)('userId', { length: 255 }).notNull(),
}, (table) => ({
    tokenIdx: (0, mysql_core_1.index)('token_idx').on(table.token),
    userIdIdx: (0, mysql_core_1.index)('userId_idx').on(table.userId),
}));
exports.sessionRelations = (0, drizzle_orm_1.relations)(exports.session, ({ one }) => ({
    user: one(exports.user, {
        fields: [exports.session.userId],
        references: [exports.user.id],
    }),
}));
// ── Account (Better Auth) ───────────────────────────────────────────────────
exports.account = (0, mysql_core_1.mysqlTable)('Account', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    accountId: (0, mysql_core_1.varchar)('accountId', { length: 255 }).notNull(),
    providerId: (0, mysql_core_1.varchar)('providerId', { length: 255 }).notNull(),
    accessToken: (0, mysql_core_1.text)('accessToken'),
    refreshToken: (0, mysql_core_1.text)('refreshToken'),
    idToken: (0, mysql_core_1.text)('idToken'),
    accessTokenExpiresAt: (0, mysql_core_1.datetime)('accessTokenExpiresAt'),
    refreshTokenExpiresAt: (0, mysql_core_1.datetime)('refreshTokenExpiresAt'),
    scope: (0, mysql_core_1.text)('scope'),
    password: (0, mysql_core_1.text)('password'),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)('updatedAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    userId: (0, mysql_core_1.varchar)('userId', { length: 255 }).notNull(),
}, (table) => ({
    userIdIdx: (0, mysql_core_1.index)('userId_idx').on(table.userId),
    providerAccountIdx: (0, mysql_core_1.index)('provider_account_idx').on(table.providerId, table.accountId),
}));
exports.accountRelations = (0, drizzle_orm_1.relations)(exports.account, ({ one }) => ({
    user: one(exports.user, {
        fields: [exports.account.userId],
        references: [exports.user.id],
    }),
}));
// ── Verification (Better Auth) ──────────────────────────────────────────────
exports.verification = (0, mysql_core_1.mysqlTable)('Verification', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    identifier: (0, mysql_core_1.varchar)('identifier', { length: 255 }).notNull(),
    value: (0, mysql_core_1.text)('value').notNull(),
    expiresAt: (0, mysql_core_1.datetime)('expiresAt').notNull(),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)('updatedAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => ({
    identifierIdx: (0, mysql_core_1.index)('identifier_idx').on(table.identifier),
}));
// ── QuickRegistration ───────────────────────────────────────────────────────
exports.quickRegistration = (0, mysql_core_1.mysqlTable)('QuickRegistration', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    passportNumber: (0, mysql_core_1.varchar)('passportNumber', { length: 255 }).notNull(),
    passportType: (0, mysql_core_1.varchar)('passportType', { length: 255 }).default('original'),
    surname: (0, mysql_core_1.varchar)('surname', { length: 255 }).notNull(),
    givenNames: (0, mysql_core_1.varchar)('givenNames', { length: 255 }).notNull(),
    dateOfBirth: (0, mysql_core_1.varchar)('dateOfBirth', { length: 255 }),
    gender: (0, mysql_core_1.varchar)('gender', { length: 255 }),
    nationality: (0, mysql_core_1.varchar)('nationality', { length: 255 }),
    dateOfExpiry: (0, mysql_core_1.varchar)('dateOfExpiry', { length: 255 }),
    issuingCountry: (0, mysql_core_1.varchar)('issuingCountry', { length: 255 }),
    placeOfBirth: (0, mysql_core_1.varchar)('placeOfBirth', { length: 255 }),
    educationLevel: (0, mysql_core_1.varchar)('educationLevel', { length: 255 }),
    jobExperience: (0, mysql_core_1.text)('jobExperience'),
    maritalStatus: (0, mysql_core_1.varchar)('maritalStatus', { length: 255 }),
    numberOfChildren: (0, mysql_core_1.int)('numberOfChildren').notNull().default(0),
    passportImageUrl: (0, mysql_core_1.text)('passportImageUrl'),
    religion: (0, mysql_core_1.varchar)('religion', { length: 255 }),
    relativePhones: (0, mysql_core_1.json)('relativePhones'),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    verificationStatus: (0, mysql_core_1.varchar)('verificationStatus', { length: 255 }).notNull().default('pending'),
    musanedCvUrl: (0, mysql_core_1.text)('musanedCvUrl'),
    verificationNotes: (0, mysql_core_1.text)('verificationNotes'),
    verifiedAt: (0, mysql_core_1.datetime)('verifiedAt'),
    promotedAt: (0, mysql_core_1.datetime)('promotedAt'),
    promotedCandidateId: (0, mysql_core_1.varchar)('promotedCandidateId', { length: 255 }),
    cocDocumentUrl: (0, mysql_core_1.text)('cocDocumentUrl'),
    labourIdUrl: (0, mysql_core_1.text)('labourIdUrl'),
    candidateIdImageUrl: (0, mysql_core_1.text)('candidateIdImageUrl'),
    relativeIdImageUrl: (0, mysql_core_1.text)('relativeIdImageUrl'),
    agency: (0, mysql_core_1.varchar)('agency', { length: 255 }).default('daera'),
    videoUrl: (0, mysql_core_1.varchar)('videoUrl', { length: 500 }),
    languages: (0, mysql_core_1.json)('languages'),
    allowVideo: (0, mysql_core_1.boolean)('allowVideo').notNull().default(false),
    laborID: (0, mysql_core_1.varchar)('laborID', { length: 255 }),
    brokerId: (0, mysql_core_1.varchar)('brokerId', { length: 255 }),
    registeredById: (0, mysql_core_1.varchar)('registeredById', { length: 255 }),
}, (table) => ({
    createdAtIdx: (0, mysql_core_1.index)('createdAt_idx').on(table.createdAt),
    brokerIdIdx: (0, mysql_core_1.index)('brokerId_idx').on(table.brokerId),
    registeredByIdIdx: (0, mysql_core_1.index)('registeredById_idx').on(table.registeredById),
}));
exports.quickRegistrationRelations = (0, drizzle_orm_1.relations)(exports.quickRegistration, ({ one }) => ({
    broker: one(exports.broker, {
        fields: [exports.quickRegistration.brokerId],
        references: [exports.broker.id],
    }),
    registeredBy: one(exports.user, {
        fields: [exports.quickRegistration.registeredById],
        references: [exports.user.id],
    }),
}));
// ── Invoice ─────────────────────────────────────────────────────────────────
exports.invoice = (0, mysql_core_1.mysqlTable)('Invoice', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    candidateId: (0, mysql_core_1.varchar)('candidateId', { length: 255 }).notNull(),
    lmisQrCodeUrl: (0, mysql_core_1.text)('lmisQrCodeUrl').notNull(),
    insuranceUrl: (0, mysql_core_1.text)('insuranceUrl').notNull(),
    ticketUrl: (0, mysql_core_1.text)('ticketUrl').notNull(),
    price: (0, mysql_core_1.varchar)('price', { length: 255 }).notNull(),
    isDelivered: (0, mysql_core_1.boolean)('isDelivered').notNull().default(false),
    deployedDate: (0, mysql_core_1.datetime)('deployedDate'),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)('updatedAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => ({
    candidateIdIdx: (0, mysql_core_1.index)('candidateId_idx').on(table.candidateId),
}));
exports.invoiceRelations = (0, drizzle_orm_1.relations)(exports.invoice, ({ one }) => ({
    candidate: one(exports.candidate, {
        fields: [exports.invoice.candidateId],
        references: [exports.candidate.id],
    }),
}));
// ── PreRegisteredVideo ──────────────────────────────────────────────────────
exports.preRegisteredVideo = (0, mysql_core_1.mysqlTable)('PreRegisteredVideo', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    passportNumber: (0, mysql_core_1.varchar)('passportNumber', { length: 255 }).notNull().unique(),
    videoUrl: (0, mysql_core_1.text)('videoUrl').notNull(),
    facePhotoUrl: (0, mysql_core_1.text)('facePhotoUrl'),
    fullBodyPhotoUrl: (0, mysql_core_1.text)('fullBodyPhotoUrl'),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
// ── Passport ────────────────────────────────────────────────────────────────
exports.passport = (0, mysql_core_1.mysqlTable)('Passport', {
    id: (0, mysql_core_1.varchar)('id', { length: 255 }).primaryKey().$defaultFn(() => (0, exports.generateId)()),
    shelfNo: (0, mysql_core_1.varchar)('shelfNo', { length: 255 }).notNull(),
    fullName: (0, mysql_core_1.varchar)('fullName', { length: 255 }).notNull(),
    passportNumber: (0, mysql_core_1.varchar)('passportNumber', { length: 255 }).notNull().unique(),
    passportImageUrl: (0, mysql_core_1.text)('passportImageUrl'),
    status: (0, mysql_core_1.varchar)('status', { length: 255 }).notNull().default('Available'),
    takenReason: (0, mysql_core_1.text)('takenReason'),
    takenByName: (0, mysql_core_1.varchar)('takenByName', { length: 255 }),
    takenByPhone: (0, mysql_core_1.varchar)('takenByPhone', { length: 255 }),
    createdAt: (0, mysql_core_1.datetime)('createdAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, mysql_core_1.datetime)('updatedAt').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => ({
    passportNumberIdx: (0, mysql_core_1.index)('passportNumber_idx').on(table.passportNumber),
    statusIdx: (0, mysql_core_1.index)('status_idx').on(table.status),
}));
