-- ============================================================
-- COOLSTAFF Database Schema Sync Script
-- Run this in phpMyAdmin on cPanel (coolstou_db)
-- This script safely adds missing tables and columns.
-- It will NOT delete existing data.
-- ============================================================

-- ── 1. Create tables that might be missing ─────────────────

CREATE TABLE IF NOT EXISTS `Broker` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `Broker_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Candidate` (
    `id` VARCHAR(191) NOT NULL,
    `shelfId` VARCHAR(191) NULL,
    `passportNumber` VARCHAR(191) NOT NULL,
    `surname` VARCHAR(191) NOT NULL,
    `givenNames` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `nationality` VARCHAR(191) NOT NULL,
    `issuingCountry` VARCHAR(191) NOT NULL,
    `dateOfIssue` DATETIME(3) NOT NULL,
    `dateOfExpiry` DATETIME(3) NOT NULL,
    `placeOfBirth` VARCHAR(191) NOT NULL,
    `maritalStatus` VARCHAR(191) NOT NULL,
    `numberOfChildren` INTEGER NOT NULL DEFAULT 0,
    `religion` VARCHAR(191) NOT NULL,
    `bloodType` VARCHAR(191) NOT NULL,
    `height` VARCHAR(191) NULL,
    `weight` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `additionalPhones` JSON NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `idNumber` VARCHAR(191) NULL,
    `job` VARCHAR(191) NULL,
    `educationLevel` VARCHAR(191) NULL,
    `languages` JSON NULL,
    `workExperience` JSON NULL,
    `skills` JSON NULL,
    `medicalStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `biometricStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `medicalDate` DATETIME(3) NULL,
    `biometricDate` DATETIME(3) NULL,
    `knownConditions` VARCHAR(191) NULL,
    `cvDeadline` DATETIME(3) NULL,
    `emergencyContactName` VARCHAR(191) NULL,
    `emergencyContactRelation` VARCHAR(191) NULL,
    `emergencyContactPhone` VARCHAR(191) NULL,
    `emergencyContactAddress` VARCHAR(191) NULL,
    `passportImageUrl` VARCHAR(191) NULL,
    `facePhotoUrl` VARCHAR(191) NULL,
    `fullBodyPhotoUrl` VARCHAR(191) NULL,
    `cocDocumentUrl` VARCHAR(191) NULL,
    `medicalDocumentUrl` VARCHAR(191) NULL,
    `candidateIdImageUrl` VARCHAR(191) NULL,
    `relativeIdImageUrl` VARCHAR(191) NULL,
    `labourIdUrl` VARCHAR(191) NULL,
    `isRequested` BOOLEAN NOT NULL DEFAULT false,
    `visaOrContractNumber` VARCHAR(191) NULL,
    `isFlagged` BOOLEAN NOT NULL DEFAULT false,
    `videoUrl` VARCHAR(191) NULL,
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `visaSelected` BOOLEAN NOT NULL DEFAULT false,
    `brokerId` VARCHAR(191) NULL,
    UNIQUE INDEX `Candidate_passportNumber_key`(`passportNumber`),
    INDEX `Candidate_passportNumber_idx`(`passportNumber`),
    INDEX `Candidate_nationality_idx`(`nationality`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GeneratedCV` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `facePhotoUrl` TEXT NULL,
    `fullBodyPhotoUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `GeneratedCV_templateId_idx`(`templateId`),
    INDEX `GeneratedCV_candidateId_idx`(`candidateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `candidateId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    INDEX `Notification_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Session` (
    `id` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    UNIQUE INDEX `Session_token_key`(`token`),
    INDEX `Session_token_idx`(`token`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Account` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    INDEX `Account_userId_idx`(`userId`),
    INDEX `Account_providerId_accountId_idx`(`providerId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Verification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Verification_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `QuickRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `passportNumber` VARCHAR(191) NOT NULL,
    `surname` VARCHAR(191) NOT NULL,
    `givenNames` VARCHAR(191) NOT NULL,
    `dateOfBirth` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `dateOfExpiry` VARCHAR(191) NULL,
    `issuingCountry` VARCHAR(191) NULL,
    `placeOfBirth` VARCHAR(191) NULL,
    `educationLevel` VARCHAR(191) NULL,
    `jobExperience` LONGTEXT NULL,
    `maritalStatus` VARCHAR(191) NULL,
    `numberOfChildren` INTEGER NOT NULL DEFAULT 0,
    `passportImageUrl` LONGTEXT NULL,
    `religion` VARCHAR(191) NULL,
    `relativePhones` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `brokerId` VARCHAR(191) NULL,
    INDEX `QuickRegistration_createdAt_idx`(`createdAt`),
    INDEX `QuickRegistration_brokerId_idx`(`brokerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 2. Add missing columns to existing tables (safe - ignores if exists) ───

-- Candidate table: columns that may be missing from older schema
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `shelfId` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `additionalPhones` JSON NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `idNumber` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `biometricStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending';
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `biometricDate` DATETIME(3) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `cvDeadline` DATETIME(3) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `emergencyContactAddress` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `candidateIdImageUrl` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `relativeIdImageUrl` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `labourIdUrl` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `isRequested` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `visaOrContractNumber` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `isFlagged` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `videoUrl` VARCHAR(191) NULL;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `visaSelected` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Candidate` ADD COLUMN IF NOT EXISTS `brokerId` VARCHAR(191) NULL;

-- ── 3. Add Foreign Keys (safe - will error harmlessly if already exist) ───

ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_brokerId_fkey` FOREIGN KEY (`brokerId`) REFERENCES `Broker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `GeneratedCV` ADD CONSTRAINT `GeneratedCV_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuickRegistration` ADD CONSTRAINT `QuickRegistration_brokerId_fkey` FOREIGN KEY (`brokerId`) REFERENCES `Broker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
