import express, { Request, Response } from 'express';
import prisma from '../lib/prisma'; // adjust import path as needed
import path from 'path';
import fs from 'fs';
import * as mime from 'mime-types';
import ExcelJS from 'exceljs';

const router = express.Router();

// GET deployments list (visaSelected = true, has ticket, has deployedDate on candidate)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Use raw SQL to read deployedDate from Candidate (not Invoice)
    const rawCandidates: any[] = await prisma.$queryRawUnsafe(`
      SELECT c.id, c.givenNames, c.surname, c.passportNumber, c.deployedDate,
             b.name AS brokerName
      FROM \`Candidate\` c
      LEFT JOIN \`Broker\` b ON c.brokerId = b.id
      WHERE c.visaSelected = 1
        AND c.deployedDate IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM \`Invoice\` i WHERE i.candidateId = c.id AND i.ticketUrl IS NOT NULL AND i.ticketUrl != ''
        )
      ORDER BY c.deployedDate DESC
    `);

    // Get CV templates for these candidates
    const candidateIds = rawCandidates.map((c: any) => c.id);
    let cvMap: Record<string, string> = {};
    if (candidateIds.length > 0) {
      try {
        const cvRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT candidateId, templateId FROM \`GeneratedCV\` WHERE candidateId IN (${candidateIds.map(() => '?').join(',')})`,
          ...candidateIds
        );
        for (const row of cvRows) {
          if (!cvMap[row.candidateId]) {
            cvMap[row.candidateId] = row.templateId;
          }
        }
      } catch (_) { /* GeneratedCV table may not exist */ }
    }

    const result = rawCandidates.map((c: any) => ({
      id: c.id,
      givenNames: c.givenNames,
      surname: c.surname,
      passportNumber: c.passportNumber,
      broker: c.brokerName ? { name: c.brokerName } : null,
      generatedCVs: cvMap[c.id] ? [{ templateId: cvMap[c.id] }] : [],
      deployedDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
      // Keep backward-compatible invoice shape for existing frontend
      invoices: [{
        ticketUrl: 'exists',
        deployedDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
      }],
    }));

    res.json(result);
  } catch (err) {
    console.error('Failed to fetch deployments', err);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// POST export Excel
router.post('/export', async (req: Request, res: Response) => {
  try {
    // Use raw SQL to read deployedDate from Candidate (not Invoice)
    const rawCandidates: any[] = await prisma.$queryRawUnsafe(`
      SELECT c.id, c.givenNames, c.surname, c.passportNumber, c.deployedDate,
             b.name AS brokerName
      FROM \`Candidate\` c
      LEFT JOIN \`Broker\` b ON c.brokerId = b.id
      WHERE c.visaSelected = 1
        AND c.deployedDate IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM \`Invoice\` i WHERE i.candidateId = c.id AND i.ticketUrl IS NOT NULL AND i.ticketUrl != ''
        )
      ORDER BY c.deployedDate DESC
    `);

    // Get CV templates for these candidates
    const candidateIds = rawCandidates.map((c: any) => c.id);
    let cvMap: Record<string, string> = {};
    if (candidateIds.length > 0) {
      try {
        const cvRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT candidateId, templateId FROM \`GeneratedCV\` WHERE candidateId IN (${candidateIds.map(() => '?').join(',')})`,
          ...candidateIds
        );
        for (const row of cvRows) {
          if (!cvMap[row.candidateId]) {
            cvMap[row.candidateId] = row.templateId;
          }
        }
      } catch (_) { /* GeneratedCV table may not exist */ }
    }

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
    rawCandidates.forEach(c => {
      const date = c.deployedDate ? new Date(c.deployedDate) : null;
      const dateStr = date ? date.toLocaleDateString() : '';

      if (lastDateStr && dateStr && dateStr !== lastDateStr) {
        // Insert blank row between different dates
        sheet.addRow([]);
      }

      const cvTemplate = cvMap[c.id]?.toUpperCase() || 'N/A';

      sheet.addRow({
        id: c.id,
        name: `${c.givenNames} ${c.surname}`,
        passportNumber: c.passportNumber,
        cvTemplate: cvTemplate,
        broker: c.brokerName || 'DIRECT',
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
