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
        \`isLocked\` TINYINT(1) NOT NULL DEFAULT 0,
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
        \`Youtube_URL\` VARCHAR(191) NULL,
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
        \`passportType\` VARCHAR(191) NOT NULL DEFAULT 'original',
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

  // 7. Create/Heal PreRegisteredVideo Table
  try {
    let hasPassportNumber = false;
    let hasFacePhoto = false;
    let hasFullBodyPhoto = false;
    let hasFullName = false;

    try {
      const columns: any[] = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`PreRegisteredVideo\``);
      hasPassportNumber = columns.some(c => c.Field === 'passportNumber');
      hasFacePhoto = columns.some(c => c.Field === 'facePhotoUrl');
      hasFullBodyPhoto = columns.some(c => c.Field === 'fullBodyPhotoUrl');
      hasFullName = columns.some(c => c.Field === 'fullName');
    } catch (_) {
      // Table doesn't exist yet, we will create it below
    }

    if (hasFullName) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`PreRegisteredVideo\` DROP INDEX \`PreRegisteredVideo_fullName_key\``);
      } catch (_) {}
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`PreRegisteredVideo\` CHANGE COLUMN \`fullName\` \`passportNumber\` VARCHAR(191) NOT NULL`);
        await prisma.$executeRawUnsafe(`ALTER TABLE \`PreRegisteredVideo\` ADD UNIQUE KEY \`PreRegisteredVideo_passportNumber_key\` (\`passportNumber\`)`);
        console.log(`✅ Successfully updated PreRegisteredVideo table: renamed 'fullName' to 'passportNumber' and made it unique.`);
        hasPassportNumber = true;
      } catch (e: any) {
        console.warn('⚠️ PreRegisteredVideo migration warning:', e.message || e);
      }
    } else if (!hasPassportNumber) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`PreRegisteredVideo\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`passportNumber\` VARCHAR(191) NOT NULL,
          \`videoUrl\` TEXT NOT NULL,
          \`facePhotoUrl\` TEXT NULL,
          \`fullBodyPhotoUrl\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`PreRegisteredVideo_passportNumber_key\` (\`passportNumber\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      console.log(`✅ Verified/Created 'PreRegisteredVideo' table.`);
      hasPassportNumber = true;
      hasFacePhoto = true;
      hasFullBodyPhoto = true;
    }

    // Incremental column checks for facePhotoUrl and fullBodyPhotoUrl
    if (hasPassportNumber) {
      if (!hasFacePhoto) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE \`PreRegisteredVideo\` ADD COLUMN \`facePhotoUrl\` TEXT NULL`);
          console.log(`✅ Successfully added column 'facePhotoUrl' to PreRegisteredVideo table.`);
        } catch (_) {}
      }
      if (!hasFullBodyPhoto) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE \`PreRegisteredVideo\` ADD COLUMN \`fullBodyPhotoUrl\` TEXT NULL`);
          console.log(`✅ Successfully added column 'fullBodyPhotoUrl' to PreRegisteredVideo table.`);
        } catch (_) {}
      }
    }
  } catch (e: any) {
    console.warn('⚠️ PreRegisteredVideo table self-healing warning:', e.message || e);
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
    { name: 'relativeIdImageUrl', type: 'LONGTEXT NULL' },
    { name: 'deployedDate', type: 'DATETIME(3) NULL' }
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
    { name: 'passportType', type: "VARCHAR(191) NULL DEFAULT 'original'" },
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
    { name: 'videoUrl', type: 'VARCHAR(500) NULL' },
    { name: 'registeredById', type: 'VARCHAR(191) NULL' }
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

  // 10b. Incremental Broker column additions
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Broker\` ADD COLUMN \`isLocked\` TINYINT(1) NOT NULL DEFAULT 0`);
    console.log(`✅ Successfully added column 'isLocked' to Broker table.`);
  } catch (e: any) {
    const msg = e.message || String(e);
    if (msg.includes('Duplicate column') || msg.includes('already exists') || e.code === 'P2010') {
      // column already exists
    } else {
      console.warn(`⚠️ Broker column fallback update warning for 'isLocked':`, msg);
    }
  }

  // 10c. Alter QuickRegistration passportType default to original
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`QuickRegistration\` ALTER COLUMN \`passportType\` SET DEFAULT 'original'`);
    console.log(`✅ Successfully updated default of 'passportType' to 'original' in QuickRegistration table.`);
  } catch (e: any) {
    console.warn(`⚠️ QuickRegistration default update warning for 'passportType':`, e.message || e);
  }

  // 10d. Rename Candidate.videoUrl → Youtube_URL (if old column still exists)
  try {
    const candidateCols: any[] = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`Candidate\``);
    const hasOldVideoUrl = candidateCols.some((c: any) => c.Field === 'videoUrl');
    const hasYoutubeUrl = candidateCols.some((c: any) => c.Field === 'Youtube_URL');

    if (hasOldVideoUrl && !hasYoutubeUrl) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`Candidate\` CHANGE COLUMN \`videoUrl\` \`Youtube_URL\` VARCHAR(191) NULL`);
        console.log(`✅ Successfully renamed Candidate column 'videoUrl' to 'Youtube_URL'.`);
      } catch (renameErr: any) {
        console.warn(`⚠️ Candidate videoUrl rename warning:`, renameErr.message || renameErr);
      }
    } else if (!hasOldVideoUrl && !hasYoutubeUrl) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`Candidate\` ADD COLUMN \`Youtube_URL\` VARCHAR(191) NULL`);
        console.log(`✅ Successfully added column 'Youtube_URL' to Candidate table.`);
      } catch (_) {}
    } else {
      // Youtube_URL already exists, nothing to do
    }
  } catch (colCheckErr: any) {
    console.warn(`⚠️ Candidate Youtube_URL column check warning:`, colCheckErr.message || colCheckErr);
  }

  // 11. Run auto-migration for previously registered candidates' videos
  try {
    console.log('🔄 Running auto-migration for existing candidates with missing videos...');
    const candidates: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, passportNumber, quickVideoUrl, Youtube_URL FROM \`Candidate\` WHERE quickVideoUrl IS NULL OR quickVideoUrl = '' OR Youtube_URL IS NULL OR Youtube_URL = ''`
    );

    console.log(`🔍 Found ${candidates.length} candidates with missing video fields to check.`);

    let migrationCount = 0;
    for (const cand of candidates) {
      if (!cand.passportNumber) continue;
      
      // Find matching QuickRegistration record
      const quickReg = await prisma.quickRegistration.findFirst({
        where: {
          passportNumber: cand.passportNumber,
          AND: [
            { videoUrl: { not: null } },
            { videoUrl: { not: '' } }
          ]
        },
        select: {
          videoUrl: true
        }
      });

      if (quickReg && quickReg.videoUrl) {
        const isLocalVideo = quickReg.videoUrl.startsWith('/uploads');
        
        if (isLocalVideo) {
          await prisma.$executeRawUnsafe(
            `UPDATE \`Candidate\` SET \`quickVideoUrl\` = ? WHERE \`id\` = ?`,
            quickReg.videoUrl,
            cand.id
          );
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE \`Candidate\` SET \`Youtube_URL\` = ? WHERE \`id\` = ?`,
            quickReg.videoUrl,
            cand.id
          );
        }
        migrationCount++;
      }
    }
    
    if (migrationCount > 0) {
      console.log(`✅ Successfully auto-migrated video paths for ${migrationCount} existing candidates!`);
    } else {
      console.log('ℹ️ No existing candidate videos needed migration.');
    }
  } catch (migErr: any) {
    console.warn('⚠️ Auto-migration of existing candidate videos failed:', migErr.message || migErr);
  }

  // 12. Auto-backfill registeredById for promoted QuickRegistration records using matched Candidates
  try {
    console.log('🔄 Running auto-backfill of registeredById for QuickRegistration records...');
    const backfilledCount = await prisma.$executeRawUnsafe(`
      UPDATE \`QuickRegistration\` q 
      INNER JOIN \`Candidate\` c ON q.passportNumber = c.passportNumber 
      SET q.registeredById = c.registeredById 
      WHERE q.registeredById IS NULL AND c.registeredById IS NOT NULL
    `);
    if (backfilledCount > 0) {
      console.log(`✅ Successfully backfilled registeredById for ${backfilledCount} QuickRegistration records!`);
    } else {
      console.log('ℹ️ No QuickRegistration records needed registeredById backfilling.');
    }
  } catch (backfillErr: any) {
    console.warn('⚠️ Auto-backfill of QuickRegistration registeredById failed:', backfillErr.message || backfillErr);
  }

  console.log('✅ Database self-healing complete.');
}
