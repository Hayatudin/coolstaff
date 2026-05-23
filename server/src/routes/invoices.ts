import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';

const router = Router();

// GET /api/invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    // Attempt standard Prisma fetch first
    try {
      const invoices = await prisma.invoice.findMany({
        include: {
          candidate: {
            include: {
              generatedCVs: { select: { templateId: true } },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return res.json(invoices);
    } catch (prismaErr: any) {
      console.warn('Prisma invoice fetch failed, falling back to raw SQL query:', prismaErr.message || prismaErr);
      
      // Fallback query to load invoices and candidate relationship directly from raw MySQL
      const invoices = await prisma.$queryRawUnsafe<any[]>(
        `SELECT i.*, 
                c.givenNames as candidate_givenNames, 
                c.surname as candidate_surname, 
                c.email as candidate_email, 
                c.passportNumber as candidate_passportNumber,
                c.registeredAt as candidate_registeredAt,
                c.visaDate as candidate_visaDate
         FROM \`Invoice\` i 
         JOIN \`Candidate\` c ON i.candidateId = c.id
         ORDER BY i.createdAt DESC`
      );

      // Fetch all generatedCVs to attach templateIds
      const allCVs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT candidateId, templateId FROM \`GeneratedCV\``
      );
      const cvMap = new Map<string, string[]>();
      for (const cv of allCVs) {
        const existing = cvMap.get(cv.candidateId) || [];
        existing.push(cv.templateId);
        cvMap.set(cv.candidateId, existing);
      }

      // Reformat the rows to match the include object expected by the frontend
      const mapped = invoices.map(row => ({
        id: row.id,
        candidateId: row.candidateId,
        lmisQrCodeUrl: row.lmisQrCodeUrl,
        insuranceUrl: row.insuranceUrl,
        ticketUrl: row.ticketUrl,
        price: row.price,
        isDelivered: Boolean(row.isDelivered),
        deployedDate: row.deployedDate || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        candidate: {
          givenNames: row.candidate_givenNames,
          surname: row.candidate_surname,
          email: row.candidate_email,
          passportNumber: row.candidate_passportNumber,
          registeredAt: row.candidate_registeredAt,
          visaDate: row.candidate_visaDate,
          generatedCVs: (cvMap.get(row.candidateId) || []).map((tid: string) => ({ templateId: tid })),
        }
      }));
      return res.json(mapped);
    }
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', message: error.message });
  }
});

// POST /api/invoices
router.post('/', async (req: Request, res: Response) => {
  try {
    const { candidateId, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;

    if (!candidateId || !lmisQrCodeUrl || !insuranceUrl || !ticketUrl) {
      return res.status(400).json({ error: 'Missing required invoice fields' });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Determine price based on the most recent generated CV template for this candidate
    let price = "0";
    try {
      const cvs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT templateId FROM \`GeneratedCV\` WHERE candidateId = ? ORDER BY createdAt DESC LIMIT 1`,
        candidateId
      );
      if (cvs.length > 0) {
        const latestTemplate = cvs[0].templateId;
        const prices = await prisma.$queryRawUnsafe<any[]>(
          `SELECT price FROM \`TemplatePrice\` WHERE templateId = ?`,
          latestTemplate
        );
        if (prices.length > 0) {
          price = prices[0].price;
        }
      }
    } catch (_) { /* ignore if no table or no CVs */ }

    // Upload files
    const [lmisPath, insurancePath, ticketPath] = await Promise.all([
      uploadToLocal(lmisQrCodeUrl, 'invoices/lmis'),
      uploadToLocal(insuranceUrl, 'invoices/insurance'),
      uploadToLocal(ticketUrl, 'invoices/ticket'),
    ]);

    const id = `inv_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const finalDeployedDate = deployedDate ? new Date(deployedDate) : null;

    try {
      // Direct raw insertion to bypass Prisma Client model caches
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`Invoice\` (\`id\`, \`candidateId\`, \`lmisQrCodeUrl\`, \`insuranceUrl\`, \`ticketUrl\`, \`price\`, \`isDelivered\`, \`deployedDate\`, \`createdAt\`, \`updatedAt\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        candidateId,
        lmisPath || '',
        insurancePath || '',
        ticketPath || '',
        price,
        0, // isDelivered = false
        finalDeployedDate,
        now,
        now
      );

      const invoice = {
        id,
        candidateId,
        price,
        lmisQrCodeUrl: lmisPath || '',
        insuranceUrl: insurancePath || '',
        ticketUrl: ticketPath || '',
        isDelivered: false,
        deployedDate: finalDeployedDate,
        createdAt: now,
        updatedAt: now,
      };
      
      return res.status(201).json(invoice);
    } catch (dbErr: any) {
      console.warn('Raw SQL Insert failed, attempting standard Prisma insert:', dbErr.message || dbErr);

      // Fallback standard Prisma insert
      const invoice = await prisma.invoice.create({
        data: {
          id, // Explicitly pass the pre-generated ID to prevent primary key field missing warnings
          candidateId,
          price,
          lmisQrCodeUrl: lmisPath || '',
          insuranceUrl: insurancePath || '',
          ticketUrl: ticketPath || '',
          isDelivered: false,
          deployedDate: finalDeployedDate,
        },
      });

      return res.status(201).json(invoice);
    }
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ 
      error: 'Failed to save invoice', 
      message: error.message || 'Unknown error',
      details: error
    });
  }
});

// PATCH /api/invoices/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isDelivered } = req.body;

    if (typeof isDelivered !== 'boolean') {
      return res.status(400).json({ error: 'isDelivered must be a boolean' });
    }

    const deployedDate = isDelivered ? new Date() : null;

    try {
      const invoice = await prisma.invoice.update({
        where: { id },
        data: { isDelivered, deployedDate } as any,
      });
      return res.json(invoice);
    } catch (prismaErr: any) {
      console.warn('Prisma invoice update failed, falling back to raw SQL:', prismaErr.message || prismaErr);
      
      await prisma.$executeRawUnsafe(
        `UPDATE \`Invoice\` SET \`isDelivered\` = ?, \`deployedDate\` = ? WHERE \`id\` = ?`,
        isDelivered ? 1 : 0,
        deployedDate,
        id
      );
      
      return res.json({ id, isDelivered, deployedDate });
    }
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;

    // Price is now optional on PUT because it can just be kept as is if not provided
    // Wait, the UI doesn't have price field anymore, so we shouldn't fail if price is not passed on PUT.
    let updatedPrice = price;
    if (!updatedPrice) {
      // Just keep existing price
      try {
        const current = await prisma.$queryRawUnsafe<any[]>(`SELECT price FROM \`Invoice\` WHERE id = ?`, id);
        if (current.length > 0) updatedPrice = current[0].price;
      } catch (_) {}
    }

    // Process new file uploads if passed as base64
    let lmisPath = lmisQrCodeUrl;
    let insurancePath = insuranceUrl;
    let ticketPath = ticketUrl;

    const uploadPromises = [];
    if (lmisQrCodeUrl && lmisQrCodeUrl.startsWith('data:')) {
      uploadPromises.push(
        uploadToLocal(lmisQrCodeUrl, 'invoices/lmis').then(p => { if (p) lmisPath = p; })
      );
    }
    if (insuranceUrl && insuranceUrl.startsWith('data:')) {
      uploadPromises.push(
        uploadToLocal(insuranceUrl, 'invoices/insurance').then(p => { if (p) insurancePath = p; })
      );
    }
    if (ticketUrl && ticketUrl.startsWith('data:')) {
      uploadPromises.push(
        uploadToLocal(ticketUrl, 'invoices/ticket').then(p => { if (p) ticketPath = p; })
      );
    }

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    const now = new Date();
    const finalDeployedDate = deployedDate !== undefined ? (deployedDate ? new Date(deployedDate) : null) : undefined;

    try {
      // Standard Prisma Update
      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          price: updatedPrice || '0',
          lmisQrCodeUrl: lmisPath || '',
          insuranceUrl: insurancePath || '',
          ticketUrl: ticketPath || '',
          ...(finalDeployedDate !== undefined ? { deployedDate: finalDeployedDate } : {}),
        },
        include: {
          candidate: true
        }
      });
      return res.json(updated);
    } catch (prismaErr: any) {
      console.warn('Prisma invoice update failed, falling back to raw SQL update:', prismaErr.message || prismaErr);
      
      // Raw SQL Update fallback
      if (finalDeployedDate !== undefined) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Invoice\` 
           SET \`price\` = ?, \`lmisQrCodeUrl\` = ?, \`insuranceUrl\` = ?, \`ticketUrl\` = ?, \`deployedDate\` = ?, \`updatedAt\` = ?
           WHERE \`id\` = ?`,
          updatedPrice || '0',
          lmisPath || '',
          insurancePath || '',
          ticketPath || '',
          finalDeployedDate,
          now,
          id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Invoice\` 
           SET \`price\` = ?, \`lmisQrCodeUrl\` = ?, \`insuranceUrl\` = ?, \`ticketUrl\` = ?, \`updatedAt\` = ?
           WHERE \`id\` = ?`,
          updatedPrice || '0',
          lmisPath || '',
          insurancePath || '',
          ticketPath || '',
          now,
          id
        );
      }

      // Fetch the updated candidate to join in return payload
      const candidateInfo = await prisma.$queryRawUnsafe<any[]>(
        `SELECT c.givenNames, c.surname, c.email, c.passportNumber, c.registeredAt, c.visaDate
         FROM \`Candidate\` c
         JOIN \`Invoice\` i ON i.candidateId = c.id
         WHERE i.id = ?`,
        id
      );

      const candidate = candidateInfo[0] ? {
        givenNames: candidateInfo[0].givenNames,
        surname: candidateInfo[0].surname,
        email: candidateInfo[0].email,
        passportNumber: candidateInfo[0].passportNumber,
        registeredAt: candidateInfo[0].registeredAt,
        visaDate: candidateInfo[0].visaDate,
      } : {};

      return res.json({
        id,
        price: updatedPrice || '0',
        lmisQrCodeUrl: lmisPath || '',
        insuranceUrl: insurancePath || '',
        ticketUrl: ticketPath || '',
        deployedDate: finalDeployedDate,
        candidate
      });
    }
  } catch (error: any) {
    console.error('Failed to update invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if exists
    const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM \`Invoice\` WHERE id = ?`, id);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    try {
      await prisma.invoice.delete({ where: { id } });
    } catch (prismaErr) {
      await prisma.$executeRawUnsafe(`DELETE FROM \`Invoice\` WHERE id = ?`, id);
    }
    
    return res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice', message: error.message });
  }
});

export default router;
