import prisma from './prisma';

export async function ensureDatabaseSchema() {
  console.log('🔧 Starting database self-healing schema checks...');

  // 1. Create Core Better Auth Tables
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`User\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL,
        \`emailVerified\` TINYINT(1) NOT NULL DEFAULT 0,
        \`image\` VARCHAR(191) NULL,
        \`role\` VARCHAR(191) NOT NULL DEFAULT 'user',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`User_email_key\` (\`email\`),
        INDEX \`User_email_idx\` (\`email\`),
        INDEX \`User_role_idx\` (\`role\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'User' table.`);
  } catch (e: any) {
    console.warn('⚠️ User table check warning:', e.message || e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Session\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`expiresAt\` DATETIME(3) NOT NULL,
        \`token\` VARCHAR(191) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`ipAddress\` VARCHAR(191) NULL,
        \`userAgent\` TEXT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`Session_token_key\` (\`token\`),
        INDEX \`Session_token_idx\` (\`token\`),
        INDEX \`Session_userId_idx\` (\`userId\`),
        FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Session' table.`);
  } catch (e: any) {
    console.warn('⚠️ Session table check warning:', e.message || e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Account\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`accountId\` VARCHAR(191) NOT NULL,
        \`providerId\` VARCHAR(191) NOT NULL,
        \`accessToken\` TEXT NULL,
        \`refreshToken\` TEXT NULL,
        \`idToken\` TEXT NULL,
        \`accessTokenExpiresAt\` DATETIME(3) NULL,
        \`refreshTokenExpiresAt\` DATETIME(3) NULL,
        \`scope\` VARCHAR(191) NULL,
        \`password\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`userId\` VARCHAR(191) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`Account_userId_idx\` (\`userId\`),
        INDEX \`Account_providerId_accountId_idx\` (\`providerId\`, \`accountId\`),
        FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Account' table.`);
  } catch (e: any) {
    console.warn('⚠️ Account table check warning:', e.message || e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Verification\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`identifier\` VARCHAR(191) NOT NULL,
        \`value\` VARCHAR(191) NOT NULL,
        \`expiresAt\` DATETIME(3) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`Verification_identifier_idx\` (\`identifier\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Verification' table.`);
  } catch (e: any) {
    console.warn('⚠️ Verification table check warning:', e.message || e);
  }

  // 2. Create Broker Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Broker\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`Broker_name_key\` (\`name\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Broker' table.`);
  } catch (e: any) {
    console.warn('⚠️ Broker table check warning:', e.message || e);
  }

  // 3. Create Candidate Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Candidate\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`shelfId\` VARCHAR(191) NULL,
        \`passportNumber\` VARCHAR(191) NOT NULL,
        \`surname\` VARCHAR(191) NOT NULL,
        \`givenNames\` VARCHAR(191) NOT NULL,
        \`dateOfBirth\` DATETIME(3) NOT NULL,
        \`gender\` VARCHAR(191) NOT NULL,
        \`nationality\` VARCHAR(191) NOT NULL,
        \`issuingCountry\` VARCHAR(191) NOT NULL,
        \`dateOfIssue\` DATETIME(3) NOT NULL,
        \`dateOfExpiry\` DATETIME(3) NOT NULL,
        \`placeOfBirth\` VARCHAR(191) NOT NULL,
        \`maritalStatus\` VARCHAR(191) NOT NULL,
        \`numberOfChildren\` INT NOT NULL DEFAULT 0,
        \`religion\` VARCHAR(191) NOT NULL,
        \`bloodType\` VARCHAR(191) NOT NULL,
        \`height\` VARCHAR(191) NULL,
        \`weight\` VARCHAR(191) NULL,
        \`phone\` VARCHAR(191) NULL,
        \`additionalPhones\` JSON NULL,
        \`email\` VARCHAR(191) NULL,
        \`address\` VARCHAR(191) NULL,
        \`city\` VARCHAR(191) NULL,
        \`state\` VARCHAR(191) NULL,
        \`country\` VARCHAR(191) NULL,
        \`idNumber\` VARCHAR(191) NULL,
        \`job\` VARCHAR(191) NULL,
        \`educationLevel\` VARCHAR(191) NULL,
        \`languages\` JSON NULL,
        \`workExperience\` JSON NULL,
        \`skills\` JSON NULL,
        \`medicalStatus\` VARCHAR(191) NOT NULL DEFAULT 'Pending',
        \`biometricStatus\` VARCHAR(191) NOT NULL DEFAULT 'Pending',
        \`medicalDate\` DATETIME(3) NULL,
        \`biometricDate\` DATETIME(3) NULL,
        \`knownConditions\` VARCHAR(191) NULL,
        \`cvDeadline\` DATETIME(3) NULL,
        \`emergencyContactName\` VARCHAR(191) NULL,
        \`emergencyContactRelation\` VARCHAR(191) NULL,
        \`emergencyContactPhone\` VARCHAR(191) NULL,
        \`emergencyContactAddress\` VARCHAR(191) NULL,
        \`passportImageUrl\` VARCHAR(191) NULL,
        \`facePhotoUrl\` VARCHAR(191) NULL,
        \`fullBodyPhotoUrl\` VARCHAR(191) NULL,
        \`cocDocumentUrl\` LONGTEXT NULL,
        \`medicalDocumentUrl\` VARCHAR(191) NULL,
        \`candidateIdImageUrl\` LONGTEXT NULL,
        \`relativeIdImageUrl\` LONGTEXT NULL,
        \`labourIdUrl\` LONGTEXT NULL,
        \`isRequested\` TINYINT(1) NOT NULL DEFAULT 0,
        \`visaOrContractNumber\` VARCHAR(191) NULL,
        \`isFlagged\` TINYINT(1) NOT NULL DEFAULT 0,
        \`videoUrl\` VARCHAR(191) NULL,
        \`quickVideoUrl\` LONGTEXT NULL,
        \`registeredAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`status\` VARCHAR(191) NOT NULL DEFAULT 'pending',
        \`visaSelected\` TINYINT(1) NOT NULL DEFAULT 0,
        \`visaDate\` DATETIME(3) NULL,
        \`salary\` VARCHAR(191) NULL DEFAULT '1000SR',
        \`agency\` VARCHAR(191) NULL DEFAULT 'daera',
        \`brokerId\` VARCHAR(191) NULL,
        \`registeredById\` VARCHAR(191) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`Candidate_passportNumber_key\` (\`passportNumber\`),
        INDEX \`Candidate_passportNumber_idx\` (\`passportNumber\`),
        INDEX \`Candidate_nationality_idx\` (\`nationality\`),
        FOREIGN KEY (\`brokerId\`) REFERENCES \`Broker\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (\`registeredById\`) REFERENCES \`User\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Candidate' table.`);
  } catch (e: any) {
    console.warn('⚠️ Candidate table check warning:', e.message || e);
  }

  // 4. Create QuickRegistration Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`QuickRegistration\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`passportNumber\` VARCHAR(191) NOT NULL,
        \`surname\` VARCHAR(191) NOT NULL,
        \`givenNames\` VARCHAR(191) NOT NULL,
        \`dateOfBirth\` VARCHAR(191) NULL,
        \`gender\` VARCHAR(191) NULL,
        \`nationality\` VARCHAR(191) NULL,
        \`dateOfExpiry\` VARCHAR(191) NULL,
        \`issuingCountry\` VARCHAR(191) NULL,
        \`placeOfBirth\` VARCHAR(191) NULL,
        \`educationLevel\` VARCHAR(191) NULL,
        \`jobExperience\` LONGTEXT NULL,
        \`maritalStatus\` VARCHAR(191) NULL,
        \`numberOfChildren\` INT NOT NULL DEFAULT 0,
        \`passportImageUrl\` LONGTEXT NULL,
        \`religion\` VARCHAR(191) NULL,
        \`relativePhones\` JSON NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`verificationStatus\` VARCHAR(191) NOT NULL DEFAULT 'pending',
        \`musanedCvUrl\` LONGTEXT NULL,
        \`verificationNotes\` VARCHAR(191) NULL,
        \`verifiedAt\` DATETIME(3) NULL,
        \`promotedAt\` DATETIME(3) NULL,
        \`promotedCandidateId\` VARCHAR(191) NULL,
        \`cocDocumentUrl\` LONGTEXT NULL,
        \`labourIdUrl\` LONGTEXT NULL,
        \`candidateIdImageUrl\` LONGTEXT NULL,
        \`relativeIdImageUrl\` LONGTEXT NULL,
        \`agency\` VARCHAR(191) NULL DEFAULT 'daera',
        \`videoUrl\` VARCHAR(500) NULL,
        \`brokerId\` VARCHAR(191) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`QuickRegistration_createdAt_idx\` (\`createdAt\`),
        INDEX \`QuickRegistration_brokerId_idx\` (\`brokerId\`),
        FOREIGN KEY (\`brokerId\`) REFERENCES \`Broker\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'QuickRegistration' table.`);
  } catch (e: any) {
    console.warn('⚠️ QuickRegistration table check warning:', e.message || e);
  }

  // 5. Create GeneratedCV Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`GeneratedCV\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`candidateId\` VARCHAR(191) NOT NULL,
        \`templateId\` VARCHAR(191) NOT NULL,
        \`facePhotoUrl\` TEXT NULL,
        \`fullBodyPhotoUrl\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`GeneratedCV_templateId_idx\` (\`templateId\`),
        INDEX \`GeneratedCV_candidateId_idx\` (\`candidateId\`),
        FOREIGN KEY (\`candidateId\`) REFERENCES \`Candidate\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'GeneratedCV' table.`);
  } catch (e: any) {
    console.warn('⚠️ GeneratedCV table check warning:', e.message || e);
  }

  // 6. Create Notification Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Notification\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`title\` VARCHAR(191) NOT NULL,
        \`message\` VARCHAR(191) NOT NULL,
        \`isRead\` TINYINT(1) NOT NULL DEFAULT 0,
        \`candidateId\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`Notification_createdAt_idx\` (\`createdAt\`),
        INDEX \`Notification_isRead_idx\` (\`isRead\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Notification' table.`);
  } catch (e: any) {
    console.warn('⚠️ Notification table check warning:', e.message || e);
  }

  // 7. Create PreRegisteredVideo Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`PreRegisteredVideo\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`fullName\` VARCHAR(191) NOT NULL,
        \`videoUrl\` TEXT NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`PreRegisteredVideo_fullName_key\` (\`fullName\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'PreRegisteredVideo' table.`);
  } catch (e: any) {
    console.warn('⚠️ PreRegisteredVideo table check warning:', e.message || e);
  }

  // 8. Create Invoice Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Invoice\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`candidateId\` VARCHAR(191) NOT NULL,
        \`lmisQrCodeUrl\` TEXT NOT NULL,
        \`insuranceUrl\` TEXT NOT NULL,
        \`ticketUrl\` TEXT NOT NULL,
        \`price\` VARCHAR(191) NOT NULL,
        \`isDelivered\` TINYINT(1) NOT NULL DEFAULT 0,
        \`deployedDate\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`Invoice_candidateId_idx\` (\`candidateId\`),
        FOREIGN KEY (\`candidateId\`) REFERENCES \`Candidate\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Invoice' table.`);
  } catch (e: any) {
    console.warn('⚠️ Invoice table check warning:', e.message || e);
  }

  // 9. Create TemplatePrice Table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`TemplatePrice\` (
        \`templateId\` VARCHAR(191) NOT NULL,
        \`price\` VARCHAR(191) NOT NULL,
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`templateId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'TemplatePrice' table.`);
  } catch (e: any) {
    console.warn('⚠️ TemplatePrice table check warning:', e.message || e);
  }

  // 10. Run incremental column additions to support table upgrades seamlessly
  const candidateColumns = [
    { name: 'registeredById', type: 'VARCHAR(191) NULL' },
    { name: 'visaDate', type: 'DATETIME(3) NULL' },
    { name: 'salary', type: "VARCHAR(191) NULL DEFAULT '1000SR'" },
    { name: 'quickVideoUrl', type: 'LONGTEXT NULL' },
    { name: 'cocDocumentUrl', type: 'LONGTEXT NULL' },
    { name: 'labourIdUrl', type: 'LONGTEXT NULL' },
    { name: 'candidateIdImageUrl', type: 'LONGTEXT NULL' },
    { name: 'relativeIdImageUrl', type: 'LONGTEXT NULL' }
  ];

  for (const col of candidateColumns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Candidate\` ADD COLUMN \`${col.name}\` ${col.type}`);
      console.log(`✅ Successfully added column '${col.name}' to Candidate table.`);
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes('Duplicate column') || msg.includes('already exists') || e.code === 'P2010') {
        // column already exists
      } else {
        console.warn(`⚠️ Candidate column fallback update warning for '${col.name}':`, msg);
      }
    }
  }

  const quickRegColumns = [
    { name: 'verificationStatus', type: "VARCHAR(191) NOT NULL DEFAULT 'pending'" },
    { name: 'musanedCvUrl', type: 'LONGTEXT NULL' },
    { name: 'verificationNotes', type: 'VARCHAR(191) NULL' },
    { name: 'verifiedAt', type: 'DATETIME(3) NULL' },
    { name: 'promotedAt', type: 'DATETIME(3) NULL' },
    { name: 'promotedCandidateId', type: 'VARCHAR(191) NULL' },
    { name: 'cocDocumentUrl', type: 'LONGTEXT NULL' },
    { name: 'labourIdUrl', type: 'LONGTEXT NULL' },
    { name: 'candidateIdImageUrl', type: 'LONGTEXT NULL' },
    { name: 'relativeIdImageUrl', type: 'LONGTEXT NULL' },
    { name: 'videoUrl', type: 'VARCHAR(500) NULL' }
  ];

  for (const col of quickRegColumns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`QuickRegistration\` ADD COLUMN \`${col.name}\` ${col.type}`);
      console.log(`✅ Successfully added column '${col.name}' to QuickRegistration table.`);
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes('Duplicate column') || msg.includes('already exists') || e.code === 'P2010') {
        // column already exists
      } else {
        console.warn(`⚠️ QuickRegistration column fallback update warning for '${col.name}':`, msg);
      }
    }
  }

  console.log('✅ Database self-healing complete.');
}
