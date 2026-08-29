"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../lib/upload");
const auth_helper_1 = require("../lib/auth-helper");
const router = (0, express_1.Router)();
// GET /api/invoices
router.get('/', async (req, res) => {
    try {
        const session = await (0, auth_helper_1.getSession)(req);
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
        const [invoices] = await db_1.pool.query(rawSqlQuery);
        const [allCVs] = await db_1.pool.query(`SELECT candidateId, templateId FROM \`GeneratedCV\``).catch(() => [[]]);
        const cvMap = new Map();
        for (const cv of (allCVs || [])) {
            const existing = cvMap.get(cv.candidateId) || [];
            existing.push(cv.templateId);
            cvMap.set(cv.candidateId, existing);
        }
        const mapped = (invoices || []).map((row) => ({
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
                generatedCVs: (cvMap.get(row.candidateId) || []).map((tid) => ({ templateId: tid })),
            }
        }));
        return res.json(mapped);
    }
    catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices', message: error.message });
    }
});
// POST /api/invoices
router.post('/', async (req, res) => {
    try {
        const { candidateId, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;
        if (!candidateId || !lmisQrCodeUrl || !insuranceUrl || !ticketUrl) {
            return res.status(400).json({ error: 'Missing required invoice fields' });
        }
        const [cands] = await db_1.pool.query('SELECT id FROM `Candidate` WHERE `id` = ? LIMIT 1', [candidateId]);
        if (!cands || cands.length === 0) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        let price = "0";
        try {
            const [cvs] = await db_1.pool.query(`SELECT templateId FROM \`GeneratedCV\` WHERE candidateId = ? ORDER BY createdAt DESC LIMIT 1`, [candidateId]);
            if (cvs && cvs.length > 0) {
                const latestTemplate = cvs[0].templateId;
                const [prices] = await db_1.pool.query(`SELECT price FROM \`TemplatePrice\` WHERE templateId = ?`, [latestTemplate]);
                if (prices && prices.length > 0) {
                    price = prices[0].price;
                }
            }
        }
        catch (_) { }
        const [lmisPath, insurancePath, ticketPath] = await Promise.all([
            (0, upload_1.uploadToLocal)(lmisQrCodeUrl, 'invoices/lmis'),
            (0, upload_1.uploadToLocal)(insuranceUrl, 'invoices/insurance'),
            (0, upload_1.uploadToLocal)(ticketUrl, 'invoices/ticket'),
        ]);
        const id = `inv_${(0, db_1.generateId)().slice(0, 16)}`;
        const now = new Date();
        const finalDeployedDate = deployedDate ? new Date(deployedDate) : null;
        await db_1.db.insert(db_1.invoice).values({
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
    }
    catch (error) {
        console.error('Error saving invoice:', error);
        res.status(500).json({
            error: 'Failed to save invoice',
            message: error.message || 'Unknown error'
        });
    }
});
// PATCH /api/invoices/:id
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { isDelivered } = req.body;
        if (typeof isDelivered !== 'boolean') {
            return res.status(400).json({ error: 'isDelivered must be a boolean' });
        }
        const [invs] = await db_1.pool.query('SELECT id FROM `Invoice` WHERE `id` = ? LIMIT 1', [id]);
        if (!invs || invs.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        const deployedDate = isDelivered ? new Date() : null;
        await db_1.db.update(db_1.invoice).set({
            isDelivered,
            deployedDate
        }).where((0, drizzle_orm_1.eq)(db_1.invoice.id, id));
        return res.json({ id, isDelivered, deployedDate });
    }
    catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Failed to update invoice', message: error.message });
    }
});
// PUT /api/invoices/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { price, lmisQrCodeUrl, insuranceUrl, ticketUrl, deployedDate } = req.body;
        const [invs] = await db_1.pool.query('SELECT price FROM `Invoice` WHERE `id` = ? LIMIT 1', [id]);
        if (!invs || invs.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        let updatedPrice = price || invs[0].price || '0';
        let lmisPath = lmisQrCodeUrl;
        let insurancePath = insuranceUrl;
        let ticketPath = ticketUrl;
        const uploadPromises = [];
        if (lmisQrCodeUrl && lmisQrCodeUrl.startsWith('data:')) {
            uploadPromises.push((0, upload_1.uploadToLocal)(lmisQrCodeUrl, 'invoices/lmis').then(p => { if (p)
                lmisPath = p; }));
        }
        if (insuranceUrl && insuranceUrl.startsWith('data:')) {
            uploadPromises.push((0, upload_1.uploadToLocal)(insuranceUrl, 'invoices/insurance').then(p => { if (p)
                insurancePath = p; }));
        }
        if (ticketUrl && ticketUrl.startsWith('data:')) {
            uploadPromises.push((0, upload_1.uploadToLocal)(ticketUrl, 'invoices/ticket').then(p => { if (p)
                ticketPath = p; }));
        }
        if (uploadPromises.length > 0) {
            await Promise.all(uploadPromises);
        }
        const finalDeployedDate = deployedDate !== undefined ? (deployedDate ? new Date(deployedDate) : null) : undefined;
        const updateData = {
            price: updatedPrice,
            lmisQrCodeUrl: lmisPath || '',
            insuranceUrl: insurancePath || '',
            ticketUrl: ticketPath || '',
        };
        if (finalDeployedDate !== undefined) {
            updateData.deployedDate = finalDeployedDate;
        }
        await db_1.db.update(db_1.invoice).set(updateData).where((0, drizzle_orm_1.eq)(db_1.invoice.id, id));
        const [candidateInfo] = await db_1.pool.query(`SELECT c.givenNames, c.surname, c.email, c.passportNumber, c.registeredAt, c.visaDate
       FROM \`Candidate\` c
       JOIN \`Invoice\` i ON i.candidateId = c.id
       WHERE i.id = ?`, [id]);
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
    }
    catch (error) {
        console.error('Failed to update invoice:', error);
        res.status(500).json({ error: 'Failed to update invoice', message: error.message });
    }
});
// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [invs] = await db_1.pool.query('SELECT id FROM `Invoice` WHERE `id` = ? LIMIT 1', [id]);
        if (!invs || invs.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        await db_1.db.delete(db_1.invoice).where((0, drizzle_orm_1.eq)(db_1.invoice.id, id));
        return res.json({ success: true, id });
    }
    catch (error) {
        console.error('Failed to delete invoice:', error);
        res.status(500).json({ error: 'Failed to delete invoice', message: error.message });
    }
});
exports.default = router;
