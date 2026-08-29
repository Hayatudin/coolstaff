"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const exceljs_1 = __importDefault(require("exceljs"));
const router = express_1.default.Router();
// GET deployments list (visaSelected = true, has deployedDate on candidate)
router.get('/', async (req, res) => {
    try {
        const [rawCandidates] = await db_1.pool.query(`
      SELECT c.id, c.givenNames, c.surname, c.passportNumber, c.deployedDate,
             b.name AS brokerName,
             (SELECT COUNT(1) FROM \`Invoice\` i WHERE i.candidateId = c.id) AS invoiceCount
      FROM \`Candidate\` c
      LEFT JOIN \`Broker\` b ON c.brokerId = b.id
      WHERE c.visaSelected = 1
        AND c.deployedDate IS NOT NULL
      ORDER BY c.deployedDate DESC
    `);
        const candidateIds = (rawCandidates || []).map((c) => c.id);
        let cvMap = {};
        if (candidateIds.length > 0) {
            try {
                const placeholders = candidateIds.map(() => '?').join(',');
                const [cvRows] = await db_1.pool.query(`SELECT candidateId, templateId FROM \`GeneratedCV\` WHERE candidateId IN (${placeholders})`, candidateIds);
                for (const row of (cvRows || [])) {
                    if (!cvMap[row.candidateId]) {
                        cvMap[row.candidateId] = row.templateId;
                    }
                }
            }
            catch (_) { }
        }
        const result = (rawCandidates || []).map((c) => ({
            id: c.id,
            givenNames: c.givenNames,
            surname: c.surname,
            passportNumber: c.passportNumber,
            broker: c.brokerName ? { name: c.brokerName } : null,
            generatedCVs: cvMap[c.id] ? [{ templateId: cvMap[c.id] }] : [],
            deployedDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
            hasInvoice: Number(c.invoiceCount) > 0,
            invoices: Number(c.invoiceCount) > 0 ? [{ ticketUrl: 'exists' }] : [],
        }));
        res.json(result);
    }
    catch (err) {
        console.error('Failed to fetch deployments', err);
        res.status(500).json({ error: 'Failed to fetch deployments' });
    }
});
// POST export Excel
router.post('/export', async (req, res) => {
    try {
        const [rawCandidates] = await db_1.pool.query(`
      SELECT c.id, c.givenNames, c.surname, c.passportNumber, c.deployedDate,
             b.name AS brokerName
      FROM \`Candidate\` c
      LEFT JOIN \`Broker\` b ON c.brokerId = b.id
      WHERE c.visaSelected = 1
        AND c.deployedDate IS NOT NULL
      ORDER BY c.deployedDate DESC
    `);
        const candidateIds = (rawCandidates || []).map((c) => c.id);
        let cvMap = {};
        if (candidateIds.length > 0) {
            try {
                const placeholders = candidateIds.map(() => '?').join(',');
                const [cvRows] = await db_1.pool.query(`SELECT candidateId, templateId FROM \`GeneratedCV\` WHERE candidateId IN (${placeholders})`, candidateIds);
                for (const row of (cvRows || [])) {
                    if (!cvMap[row.candidateId]) {
                        cvMap[row.candidateId] = row.templateId;
                    }
                }
            }
            catch (_) { }
        }
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet('Deployments');
        sheet.columns = [
            { header: 'Candidate ID', key: 'id', width: 15 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Passport Number', key: 'passportNumber', width: 20 },
            { header: 'CV Template', key: 'cvTemplate', width: 25 },
            { header: 'Broker', key: 'broker', width: 25 },
            { header: 'Deployment Date', key: 'deploymentDate', width: 20 },
        ];
        let lastDateStr = null;
        (rawCandidates || []).forEach((c) => {
            const date = c.deployedDate ? new Date(c.deployedDate) : null;
            const dateStr = date ? date.toLocaleDateString() : '';
            if (lastDateStr && dateStr && dateStr !== lastDateStr) {
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
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = 'candidate_deployments.xlsx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    }
    catch (err) {
        console.error('Excel export error', err);
        res.status(500).json({ error: 'Failed to generate Excel' });
    }
});
exports.default = router;
