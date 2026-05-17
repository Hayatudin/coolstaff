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
          candidate: true,
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

      // Reformat the rows to match the include object expected by the frontend
      const mapped = invoices.map(row => ({
        id: row.id,
        candidateId: row.candidateId,
        lmisQrCodeUrl: row.lmisQrCodeUrl,
        insuranceUrl: row.insuranceUrl,
        ticketUrl: row.ticketUrl,
        price: row.price,
        isDelivered: Boolean(row.isDelivered),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        candidate: {
          givenNames: row.candidate_givenNames,
          surname: row.candidate_surname,
          email: row.candidate_email,
          passportNumber: row.candidate_passportNumber,
          registeredAt: row.candidate_registeredAt,
          visaDate: row.candidate_visaDate,
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
    const { candidateId, price, lmisQrCodeUrl, insuranceUrl, ticketUrl } = req.body;

    if (!candidateId || !price || !lmisQrCodeUrl || !insuranceUrl || !ticketUrl) {
      return res.status(400).json({ error: 'Missing required invoice fields' });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Upload files
    const [lmisPath, insurancePath, ticketPath] = await Promise.all([
      uploadToLocal(lmisQrCodeUrl, 'invoices/lmis'),
      uploadToLocal(insuranceUrl, 'invoices/insurance'),
      uploadToLocal(ticketUrl, 'invoices/ticket'),
    ]);

    const id = `inv_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    try {
      // Direct raw insertion to bypass Prisma Client model caches
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`Invoice\` (\`id\`, \`candidateId\`, \`lmisQrCodeUrl\`, \`insuranceUrl\`, \`ticketUrl\`, \`price\`, \`isDelivered\`, \`createdAt\`, \`updatedAt\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        candidateId,
        lmisPath || '',
        insurancePath || '',
        ticketPath || '',
        price,
        0, // isDelivered = false
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
        createdAt: now,
        updatedAt: now,
      };
      
      return res.status(201).json(invoice);
    } catch (dbErr: any) {
      console.warn('Raw SQL Insert failed, attempting standard Prisma insert:', dbErr.message || dbErr);

      // Fallback standard Prisma insert
      const invoice = await prisma.invoice.create({
        data: {
          candidateId,
          price,
          lmisQrCodeUrl: lmisPath || '',
          insuranceUrl: insurancePath || '',
          ticketUrl: ticketPath || '',
          isDelivered: false,
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

    try {
      const invoice = await prisma.invoice.update({
        where: { id },
        data: { isDelivered },
      });
      return res.json(invoice);
    } catch (prismaErr: any) {
      console.warn('Prisma invoice update failed, falling back to raw SQL:', prismaErr.message || prismaErr);
      
      await prisma.$executeRawUnsafe(
        `UPDATE \`Invoice\` SET \`isDelivered\` = ? WHERE \`id\` = ?`,
        isDelivered ? 1 : 0,
        id
      );
      
      return res.json({ id, isDelivered });
    }
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

export default router;
