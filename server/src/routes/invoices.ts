import { Router, Request, Response } from 'express';
import {
  db,
  pool,
  invoice as invoiceTable,
  candidate as candidateTable,
  generatedCv as generatedCvTable,
  generateId,
} from '../db';
import { eq } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';

const router = Router();

// GET /api/invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const role = session?.user?.role;

    let rawSqlQuery = `SELECT i.*, 
               c.givenNames as candidate_givenNames, 
               c.surname as candidate_surname, 
               c.email as candidate_email, 
               c.passportNumber as candidate_passportNumber,
               c.registeredAt as candidate_registeredAt,
               c.visaDate as candidate_visaDate
        FROM \`Invoice\` i 
        JOIN \`Candidate\` c ON i.candidateId = c.id
        LEFT JOIN \`Broker\` b ON c.brokerId = b.id
        ORDER BY i.createdAt DESC`;

    if (role === 'agency') {
      rawSqlQuery = `SELECT i.*, 
               c.givenNames as candidate_givenNames, 
               c.surname as candidate_surname, 
               c.email as candidate_email, 
               c.passportNumber as candidate_passportNumber,
               c.registeredAt as candidate_registeredAt,
               c.visaDate as candidate_visaDate
        FROM \`Invoice\` i 
        JOIN \`Candidate\` c ON i.candidateId = c.id
        LEFT JOIN \`Broker\` b ON c.brokerId = b.id
        WHERE (c.isFlagged IS NULL OR c.isFlagged = 0) AND (b.isLocked IS NULL OR b.isLocked = 0)
        ORDER BY i.createdAt DESC`;
    }

    const [invoices]: any = await pool.query(rawSqlQuery);

    const [allCVs]: any = await pool.query(
      `SELECT candidateId, templateId FROM \`GeneratedCV\``
    ).catch(() => [[]]);

    const cvMap = new Map<string, string[]>();
    for (const cv of (allCVs || [])) {
      const existing = cvMap.get(cv.candidateId) || [];
      existing.push(cv.templateId);
      cvMap.set(cv.candidateId, existing);
    }

    const mapped = (invoices || []).map((row: any) => ({
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

    const [cands]: any = await pool.query('SELECT id FROM `Candidate` WHERE `id` = ? LIMIT 1', [candidateId]);
    if (!cands || cands.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    let price = "0";
    try {
      const [cvs]: any = await pool.query(
        `SELECT templateId FROM \`GeneratedCV\` WHERE candidateId = ? ORDER BY createdAt DESC LIMIT 1`,
        [candidateId]
      );
      if (cvs && cvs.length > 0) {
        const latestTemplate = cvs[0].templateId;
        const [prices]: any = await pool.query(
          `SELECT price FROM \`TemplatePrice\` WHERE templateId = ?`,
          [latestTemplate]
        );
        if (prices && prices.length > 0) {
          price = prices[0].price;
        }
      }
    } catch (_) {}

    const [lmisPath, insurancePath, ticketPath] = await Promise.all([
      uploadToLocal(lmisQrCodeUrl, 'invoices/lmis'),
      uploadToLocal(insuranceUrl, 'invoices/insurance'),
      uploadToLocal(ticketUrl, 'invoices/ticket'),
    ]);

    const id = `inv_${generateId().slice(0, 16)}`;
    const now = new Date();
    const finalDeployedDate = deployedDate ? new Date(deployedDate) : null;

    await db.insert(invoiceTable).values({
      id,
      candidateId,
      lmisQrCodeUrl: lmisPath || '',
      insuranceUrl: insurancePath || '',
      ticketUrl: ticketPath || '',
      price,
      isDelivered: false,
      deployedDate: finalDeployedDate,
    });

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
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ 
      error: 'Failed to save invoice', 
      message: error.message || 'Unknown error'
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

    const [invs]: any = await pool.query('SELECT id FROM `Invoice` WHERE `id` = ? LIMIT 1', [id]);
    if (!invs || invs.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const deployedDate = isDelivered ? new Date() : null;

    await db.update(invoiceTable).set({
      isDelivered,
      deployedDate
    }).where(eq(invoiceTable.id, id));
    
    return res.json({ id, isDelivered, deployedDate });
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

    const [invs]: any = await pool.query('SELECT price FROM `Invoice` WHERE `id` = ? LIMIT 1', [id]);
    if (!invs || invs.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    let updatedPrice = price || invs[0].price || '0';

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

    const finalDeployedDate = deployedDate !== undefined ? (deployedDate ? new Date(deployedDate) : null) : undefined;

    const updateData: any = {
      price: updatedPrice,
      lmisQrCodeUrl: lmisPath || '',
      insuranceUrl: insurancePath || '',
      ticketUrl: ticketPath || '',
    };
    if (finalDeployedDate !== undefined) {
      updateData.deployedDate = finalDeployedDate;
    }

    await db.update(invoiceTable).set(updateData).where(eq(invoiceTable.id, id));

    const [candidateInfo]: any = await pool.query(
      `SELECT c.givenNames, c.surname, c.email, c.passportNumber, c.registeredAt, c.visaDate
       FROM \`Candidate\` c
       JOIN \`Invoice\` i ON i.candidateId = c.id
       WHERE i.id = ?`,
      [id]
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
      price: updatedPrice,
      lmisQrCodeUrl: lmisPath || '',
      insuranceUrl: insurancePath || '',
      ticketUrl: ticketPath || '',
      deployedDate: finalDeployedDate,
      candidate
    });
  } catch (error: any) {
    console.error('Failed to update invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice', message: error.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [invs]: any = await pool.query('SELECT id FROM `Invoice` WHERE `id` = ? LIMIT 1', [id]);
    if (!invs || invs.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await db.delete(invoiceTable).where(eq(invoiceTable.id, id));
    return res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice', message: error.message });
  }
});

export default router;
