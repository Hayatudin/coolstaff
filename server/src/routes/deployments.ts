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
      where: {
        visaSelected: true,
        invoices: {
          some: {
            ticketUrl: { not: '' },
            deployedDate: { not: null }
          }
        }
      },
      select: {
        id: true,
        givenNames: true,
        surname: true,
        passportNumber: true,
        broker: { select: { name: true } },
        generatedCVs: { select: { templateId: true } },
        invoices: {
          select: {
            ticketUrl: true,
            deployedDate: true,
          }
        }
      }
    });

    const sorted = candidates.sort((a, b) => {
      const dateA = a.invoices[0]?.deployedDate ? new Date(a.invoices[0].deployedDate).getTime() : 0;
      const dateB = b.invoices[0]?.deployedDate ? new Date(b.invoices[0].deployedDate).getTime() : 0;
      return dateB - dateA;
    });

    res.json(sorted);
  } catch (err) {
    console.error('Failed to fetch deployments', err);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// POST export Excel
router.post('/export', async (req: Request, res: Response) => {
  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        visaSelected: true,
        invoices: {
          some: {
            ticketUrl: { not: '' },
            deployedDate: { not: null }
          }
        }
      },
      select: {
        id: true,
        givenNames: true,
        surname: true,
        passportNumber: true,
        broker: { select: { name: true } },
        generatedCVs: { select: { templateId: true } },
        invoices: {
          select: {
            ticketUrl: true,
            deployedDate: true,
          }
        }
      }
    });

    const sorted = candidates.sort((a, b) => {
      const dateA = a.invoices[0]?.deployedDate ? new Date(a.invoices[0].deployedDate).getTime() : 0;
      const dateB = b.invoices[0]?.deployedDate ? new Date(b.invoices[0].deployedDate).getTime() : 0;
      return dateB - dateA; // Sort by deployment date descending
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Deployments');

    // Header row
    sheet.columns = [
      { header: 'Candidate ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Passport Number', key: 'passportNumber', width: 20 },
      { header: 'CV Template', key: 'cvTemplate', width: 25 },
      { header: 'Broker', key: 'broker', width: 25 },
      { header: 'Deployment Date', key: 'deploymentDate', width: 20 },
    ];

    // Insert rows
    let lastDateStr: string | null = null;
    sorted.forEach(c => {
      const invoice = c.invoices[0];
      const date = invoice?.deployedDate ? new Date(invoice.deployedDate) : null;
      const dateStr = date ? date.toLocaleDateString() : '';

      if (lastDateStr && dateStr && dateStr !== lastDateStr) {
        // Insert blank row between different dates
        sheet.addRow([]);
      }

      const cvTemplate = c.generatedCVs?.[0]?.templateId?.toUpperCase() || 'N/A';

      sheet.addRow({
        id: c.id,
        name: `${c.givenNames} ${c.surname}`,
        passportNumber: c.passportNumber,
        cvTemplate: cvTemplate,
        broker: c.broker?.name || 'DIRECT',
        deploymentDate: dateStr,
      });
      lastDateStr = dateStr;
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
