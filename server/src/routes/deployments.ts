import express, { Request, Response } from 'express';
import prisma from '../lib/prisma'; // adjust import path as needed
import path from 'path';
import fs from 'fs';
import * as mime from 'mime-types';
import ExcelJS from 'exceljs';

const router = express.Router();

// GET deployments list (visaSelected = true)
router.get('/', async (req: Request, res: Response) => {
  try {
    const candidates = await prisma.candidate.findMany({
      where: { visaSelected: true },
      select: {
        id: true,
        givenNames: true,
        surname: true,
        registeredAt: true,
      },
    });
    res.json(candidates);
  } catch (err) {
    console.error('Failed to fetch deployments', err);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// POST export Excel
router.post('/export', async (req: Request, res: Response) => {
  try {
    const candidates = await prisma.candidate.findMany({
      where: { visaSelected: true },
      select: {
        id: true,
        givenNames: true,
        surname: true,
        registeredAt: true,
        broker: { select: { name: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Deployments');

    // Header row
    sheet.columns = [
      { header: 'Candidate ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Deployment Date', key: 'deploymentDate', width: 20 },
      { header: 'Broker', key: 'broker', width: 25 },
    ];

    // Insert rows
    let lastDate: Date | null = null;
    candidates.forEach(c => {
        const date = c.registeredAt ? new Date(c.registeredAt) : null;
        if (lastDate && date && date.getTime() !== lastDate.getTime()) {
          // Insert blank row between different dates
          sheet.addRow([]);
        }
        sheet.addRow({
          id: c.id,
          name: `${c.givenNames} ${c.surname}`,
          deploymentDate: date ? date.toLocaleDateString() : '',
          broker: c.broker?.name || '',
        });
        lastDate = date;
      });

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = 'candidate_deployments.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Excel export error', err);
    res.status(500).json({ error: 'Failed to generate Excel' });
  }
});

export default router;
