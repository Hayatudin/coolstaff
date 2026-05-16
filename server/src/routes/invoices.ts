import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';

const router = Router();

// GET /api/invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        candidate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
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

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ error: 'Failed to save invoice' });
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

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { isDelivered },
    });

    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

export default router;
