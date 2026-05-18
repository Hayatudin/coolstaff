import prisma from './prisma';

export async function ensureDatabaseSchema() {
  console.log('🔧 Starting database self-healing schema checks...');
  
  // 1. Candidate Table updates
  const candidateColumns = [
    { name: 'registeredById', type: 'VARCHAR(191) NULL' },
    { name: 'visaDate', type: 'DATETIME(3) NULL' },
    { name: 'salary', type: "VARCHAR(191) NULL DEFAULT '1000SR'" },
    { name: 'videoUrl', type: 'VARCHAR(191) NULL' }
  ];

  for (const col of candidateColumns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Candidate\` ADD COLUMN \`${col.name}\` ${col.type}`);
      console.log(`✅ Successfully added column '${col.name}' to Candidate table.`);
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes('Duplicate column') || msg.includes('already exists') || e.code === 'P2010') {
        // Column already exists
      } else {
        console.warn(`⚠️ Warning trying to add Candidate.${col.name}:`, msg);
      }
    }
  }

  // 2. QuickRegistration Table updates
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
        // Column already exists
      } else {
        console.warn(`⚠️ Warning trying to add QuickRegistration.${col.name}:`, msg);
      }
    }
  }

  // 3. Invoice Table creation
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Invoice\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`candidateId\` VARCHAR(191) NOT NULL,
        \`lmisQrCodeUrl\` TEXT NOT NULL,
        \`insuranceUrl\` TEXT NOT NULL,
        \`ticketUrl\` TEXT NOT NULL,
        \`price\` VARCHAR(191) NOT NULL,
        \`isDelivered\` BOOLEAN NOT NULL DEFAULT false,
        \`deployedDate\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        FOREIGN KEY (\`candidateId\`) REFERENCES \`Candidate\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`✅ Verified/Created 'Invoice' table.`);
  } catch (e: any) {
    console.warn('⚠️ Standard Invoice table creation failed. Trying highly-compatible SQL fallback...', e.message || e);
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
          \`deployedDate\` DATETIME NULL,
          \`createdAt\` DATETIME NOT NULL,
          \`updatedAt\` DATETIME NOT NULL,
          PRIMARY KEY (\`id\`),
          FOREIGN KEY (\`candidateId\`) REFERENCES \`Candidate\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      console.log(`✅ Successfully created 'Invoice' table using highly-compatible fallback.`);
    } catch (fallbackErr: any) {
      console.error('❌ Failed to create Invoice table even with fallback:', fallbackErr.message || fallbackErr);
    }
  }

  // 4. TemplatePrice Table creation (for Super Admin Settings)
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
    console.warn('⚠️ TemplatePrice table creation failed:', e.message || e);
  }

  console.log('✅ Database self-healing complete.');
}
