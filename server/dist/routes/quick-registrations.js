"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../lib/upload");
const auth_helper_1 = require("../lib/auth-helper");
function formatDbError(error) {
    if (!error)
        return 'Unknown error';
    return error.message || String(error);
}
const router = (0, express_1.Router)();
// GET /api/quick-registrations/generate-client
router.get('/generate-client', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.write('Starting build check on server...\n\n');
    res.write('✅ Drizzle ORM active!\n');
    res.end();
});
// GET /api/quick-registrations
router.get('/', async (req, res) => {
    try {
        const [rows] = await db_1.pool.query(`
      SELECT qr.*, b.name as brokerName, u.name as registeredByName
      FROM QuickRegistration qr
      LEFT JOIN Broker b ON qr.brokerId = b.id
      LEFT JOIN User u ON qr.registeredById = u.id
      ORDER BY qr.createdAt DESC
    `);
        const parseJson = (val) => {
            if (!val)
                return null;
            if (typeof val === 'object')
                return val;
            try {
                return JSON.parse(val);
            }
            catch (_) {
                return null;
            }
        };
        const registrations = (rows || []).map((r) => ({
            id: r.id,
            passportNumber: r.passportNumber,
            surname: r.surname,
            givenNames: r.givenNames,
            dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : null,
            gender: r.gender,
            nationality: r.nationality,
            dateOfExpiry: r.dateOfExpiry ? new Date(r.dateOfExpiry).toISOString().split('T')[0] : null,
            issuingCountry: r.issuingCountry,
            placeOfBirth: r.placeOfBirth,
            educationLevel: r.educationLevel,
            jobExperience: r.jobExperience,
            maritalStatus: r.maritalStatus,
            numberOfChildren: r.numberOfChildren,
            passportImageUrl: r.passportImageUrl,
            religion: r.religion,
            brokerId: r.brokerId,
            broker: r.brokerId ? { id: r.brokerId, name: r.brokerName } : null,
            cocDocumentUrl: r.cocDocumentUrl,
            labourIdUrl: r.labourIdUrl,
            laborID: r.laborID,
            candidateIdImageUrl: r.candidateIdImageUrl,
            relativeIdImageUrl: r.relativeIdImageUrl,
            videoUrl: r.videoUrl,
            relativePhones: parseJson(r.relativePhones),
            verificationStatus: r.verificationStatus,
            promotedCandidateId: r.promotedCandidateId,
            agency: r.agency || 'daera',
            passportType: r.passportType || 'original',
            languages: parseJson(r.languages),
            allowVideo: r.allowVideo === 1 || r.allowVideo === true,
            registeredById: r.registeredById,
            registeredBy: r.registeredByName || 'Walk-in',
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
        }));
        res.json(registrations);
    }
    catch (error) {
        console.error('Failed to fetch quick registrations:', error);
        res.status(500).json({ error: 'Failed to fetch quick registrations' });
    }
});
// POST /api/quick-registrations
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        if (!body.passportNumber) {
            return res.status(400).json({ error: 'Passport number is required' });
        }
        const pNum = body.passportNumber.trim();
        const [existingQr] = await db_1.pool.query('SELECT id FROM QuickRegistration WHERE LOWER(passportNumber) = LOWER(?) LIMIT 1', [pNum]);
        if (existingQr && existingQr.length > 0) {
            return res.status(400).json({ error: 'A quick registration with this passport number already exists.' });
        }
        const [existingCandidate] = await db_1.pool.query('SELECT id FROM Candidate WHERE LOWER(passportNumber) = LOWER(?) LIMIT 1', [pNum]);
        if (existingCandidate && existingCandidate.length > 0) {
            return res.status(400).json({ error: 'A full candidate registration with this passport number already exists.' });
        }
        let registeredById = body.registeredById || null;
        try {
            const session = await (0, auth_helper_1.getSession)(req);
            if (session?.user?.id) {
                registeredById = session.user.id;
            }
        }
        catch (sessionError) { }
        const [passportImageUrl, cocDocumentUrl, labourIdUrl, candidateIdImageUrl, relativeIdImageUrl, videoUrl] = await Promise.all([
            (0, upload_1.uploadToLocal)(body.passportImageUrl, 'passports'),
            (0, upload_1.uploadToLocal)(body.cocDocumentUrl, 'coc'),
            body.labourIdUrl && body.labourIdUrl.startsWith('data:') ? (0, upload_1.uploadToLocal)(body.labourIdUrl, 'labour-id') : Promise.resolve(body.labourIdUrl || null),
            (0, upload_1.uploadToLocal)(body.candidateIdImageUrl, 'candidate-id'),
            (0, upload_1.uploadToLocal)(body.relativeIdImageUrl, 'relative-id'),
            (0, upload_1.uploadToLocal)(body.videoUrl, 'videos'),
        ]);
        const qrId = (0, db_1.generateId)();
        await db_1.db.insert(db_1.quickRegistration).values({
            id: qrId,
            passportNumber: body.passportNumber || '',
            surname: body.surname || '',
            givenNames: body.givenNames || '',
            dateOfBirth: body.dateOfBirth || null,
            gender: body.gender || null,
            nationality: body.nationality || null,
            dateOfExpiry: body.dateOfExpiry || null,
            issuingCountry: body.issuingCountry || null,
            placeOfBirth: body.placeOfBirth || null,
            educationLevel: body.educationLevel || null,
            jobExperience: body.jobExperience || null,
            maritalStatus: body.maritalStatus || null,
            numberOfChildren: parseInt(body.numberOfChildren) || 0,
            passportImageUrl,
            religion: body.religion || null,
            brokerId: body.brokerId || null,
            cocDocumentUrl: cocDocumentUrl || null,
            labourIdUrl: labourIdUrl || null,
            laborID: body.laborID || null,
            candidateIdImageUrl: candidateIdImageUrl || null,
            relativeIdImageUrl: relativeIdImageUrl || null,
            relativePhones: body.relativePhones ? JSON.stringify(body.relativePhones) : null,
            videoUrl: videoUrl || null,
            agency: body.agency || 'daera',
            passportType: body.passportType || 'original',
            languages: body.languages ? JSON.stringify(body.languages) : null,
            allowVideo: body.allowVideo ?? false,
            registeredById,
        });
        const [rows] = await db_1.pool.query(`
      SELECT qr.*, b.name as brokerName, u.name as registeredByName
      FROM QuickRegistration qr
      LEFT JOIN Broker b ON qr.brokerId = b.id
      LEFT JOIN User u ON qr.registeredById = u.id
      WHERE qr.id = ? LIMIT 1
    `, [qrId]);
        const registration = rows[0];
        registration.registeredBy = registration.registeredByName || 'Walk-in';
        res.status(201).json(registration);
    }
    catch (error) {
        console.error('Error creating quick registration:', error);
        res.status(500).json({ error: formatDbError(error) });
    }
});
// PUT /api/quick-registrations/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const [existingRows] = await db_1.pool.query('SELECT id FROM QuickRegistration WHERE id = ? LIMIT 1', [id]);
        if (!existingRows || existingRows.length === 0) {
            return res.status(404).json({ error: 'Quick registration not found' });
        }
        const [passportImageUrl, cocDocumentUrl, labourIdUrl, candidateIdImageUrl, relativeIdImageUrl, videoUrl] = await Promise.all([
            body.passportImageUrl !== undefined ? (0, upload_1.uploadToLocal)(body.passportImageUrl, 'passports') : undefined,
            body.cocDocumentUrl !== undefined ? (0, upload_1.uploadToLocal)(body.cocDocumentUrl, 'coc') : undefined,
            body.labourIdUrl !== undefined ? (0, upload_1.uploadToLocal)(body.labourIdUrl, 'labour-id') : undefined,
            body.candidateIdImageUrl !== undefined ? (0, upload_1.uploadToLocal)(body.candidateIdImageUrl, 'candidate-id') : undefined,
            body.relativeIdImageUrl !== undefined ? (0, upload_1.uploadToLocal)(body.relativeIdImageUrl, 'relative-id') : undefined,
            body.videoUrl !== undefined ? (0, upload_1.uploadToLocal)(body.videoUrl, 'videos') : undefined,
        ]);
        const updateFields = {};
        if (body.passportNumber !== undefined)
            updateFields.passportNumber = body.passportNumber;
        if (body.surname !== undefined)
            updateFields.surname = body.surname;
        if (body.givenNames !== undefined)
            updateFields.givenNames = body.givenNames;
        if (body.dateOfBirth !== undefined)
            updateFields.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
        if (body.gender !== undefined)
            updateFields.gender = body.gender;
        if (body.nationality !== undefined)
            updateFields.nationality = body.nationality;
        if (body.dateOfExpiry !== undefined)
            updateFields.dateOfExpiry = body.dateOfExpiry ? new Date(body.dateOfExpiry) : null;
        if (body.issuingCountry !== undefined)
            updateFields.issuingCountry = body.issuingCountry;
        if (body.placeOfBirth !== undefined)
            updateFields.placeOfBirth = body.placeOfBirth;
        if (body.educationLevel !== undefined)
            updateFields.educationLevel = body.educationLevel;
        if (body.jobExperience !== undefined)
            updateFields.jobExperience = body.jobExperience;
        if (body.maritalStatus !== undefined)
            updateFields.maritalStatus = body.maritalStatus;
        if (body.numberOfChildren !== undefined)
            updateFields.numberOfChildren = parseInt(body.numberOfChildren) || 0;
        if (passportImageUrl !== undefined)
            updateFields.passportImageUrl = passportImageUrl;
        if (body.religion !== undefined)
            updateFields.religion = body.religion;
        if (body.brokerId !== undefined)
            updateFields.brokerId = body.brokerId || null;
        if (cocDocumentUrl !== undefined)
            updateFields.cocDocumentUrl = cocDocumentUrl;
        if (labourIdUrl !== undefined)
            updateFields.labourIdUrl = labourIdUrl;
        if (candidateIdImageUrl !== undefined)
            updateFields.candidateIdImageUrl = candidateIdImageUrl;
        if (relativeIdImageUrl !== undefined)
            updateFields.relativeIdImageUrl = relativeIdImageUrl;
        if (body.relativePhones !== undefined)
            updateFields.relativePhones = body.relativePhones ? JSON.stringify(body.relativePhones) : null;
        if (videoUrl !== undefined)
            updateFields.videoUrl = videoUrl;
        if (body.agency !== undefined)
            updateFields.agency = body.agency || 'daera';
        if (body.passportType !== undefined)
            updateFields.passportType = body.passportType || 'original';
        if (body.languages !== undefined)
            updateFields.languages = body.languages ? JSON.stringify(body.languages) : null;
        if (body.allowVideo !== undefined)
            updateFields.allowVideo = Boolean(body.allowVideo);
        if (body.laborID !== undefined)
            updateFields.laborID = body.laborID || null;
        if (Object.keys(updateFields).length > 0) {
            await db_1.db.update(db_1.quickRegistration).set(updateFields).where((0, drizzle_orm_1.eq)(db_1.quickRegistration.id, id));
        }
        const [rows] = await db_1.pool.query(`
      SELECT qr.*, b.name as brokerName, u.name as registeredByName
      FROM QuickRegistration qr
      LEFT JOIN Broker b ON qr.brokerId = b.id
      LEFT JOIN User u ON qr.registeredById = u.id
      WHERE qr.id = ? LIMIT 1
    `, [id]);
        res.json(rows[0]);
    }
    catch (error) {
        console.error('Error updating quick registration:', error);
        res.status(500).json({ error: formatDbError(error) });
    }
});
// GET /api/quick-registrations/by-passport/:passportNumber
router.get('/by-passport/:passportNumber', async (req, res) => {
    try {
        const { passportNumber } = req.params;
        const [rows] = await db_1.pool.query(`SELECT qr.*, b.name as brokerName, u.name as registeredByName
       FROM QuickRegistration qr
       LEFT JOIN Broker b ON qr.brokerId = b.id
       LEFT JOIN User u ON qr.registeredById = u.id
       WHERE LOWER(qr.passportNumber) = LOWER(?) LIMIT 1`, [passportNumber]);
        if (!rows || rows.length === 0)
            return res.status(404).json({ error: 'Not found' });
        const registration = rows[0];
        registration.registeredBy = registration.registeredByName || 'Registrar';
        res.json(registration);
    }
    catch (error) {
        console.error('Failed to fetch quick registration by passport:', error);
        res.status(500).json({ error: 'Failed to fetch quick registration by passport' });
    }
});
// GET /api/quick-registrations/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db_1.pool.query(`SELECT qr.*, b.name as brokerName, u.name as registeredByName
       FROM QuickRegistration qr
       LEFT JOIN Broker b ON qr.brokerId = b.id
       LEFT JOIN User u ON qr.registeredById = u.id
       WHERE qr.id = ? LIMIT 1`, [id]);
        if (!rows || rows.length === 0)
            return res.status(404).json({ error: 'Not found' });
        const registration = rows[0];
        registration.registeredBy = registration.registeredByName || 'Registrar';
        res.json(registration);
    }
    catch (error) {
        console.error('Failed to fetch quick registration:', error);
        res.status(500).json({ error: 'Failed to fetch quick registration' });
    }
});
// DELETE /api/quick-registrations/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db_1.pool.query('SELECT id FROM QuickRegistration WHERE id = ? LIMIT 1', [id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        await db_1.db.delete(db_1.quickRegistration).where((0, drizzle_orm_1.eq)(db_1.quickRegistration.id, id));
        res.json({ success: true, message: 'Deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete quick registration:', error);
        res.status(500).json({ error: error.message || 'Failed to delete registration' });
    }
});
exports.default = router;
