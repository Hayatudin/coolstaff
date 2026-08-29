"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../lib/upload");
const crypto_1 = require("../lib/crypto");
const multer_1 = __importDefault(require("multer"));
const crypto_2 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'videos';
        if (file.fieldname === 'facePhoto')
            folder = 'faces';
        else if (file.fieldname === 'fullBodyPhoto')
            folder = 'fullbody';
        const dir = path_1.default.join(process.cwd(), 'public', 'uploads', folder);
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || (file.fieldname === 'video' ? '.mp4' : '.jpg');
        const uniqueSuffix = crypto_2.default.randomBytes(16).toString('hex');
        cb(null, `${uniqueSuffix}${ext}`);
    }
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
function normalizeName(name) {
    return name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
}
// 1. GET /api/video-uploads/search-candidates?q=...
router.get('/search-candidates', async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        if (!query)
            return res.json([]);
        const pattern = `%${query}%`;
        const candidates = await db_1.db
            .select({
            id: db_1.candidate.id,
            givenNames: db_1.candidate.givenNames,
            surname: db_1.candidate.surname,
            passportNumber: db_1.candidate.passportNumber,
            nationality: db_1.candidate.nationality,
            passportImageUrl: db_1.candidate.passportImageUrl,
        })
            .from(db_1.candidate)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(db_1.candidate.givenNames, pattern), (0, drizzle_orm_1.like)(db_1.candidate.surname, pattern), (0, drizzle_orm_1.like)(db_1.candidate.passportNumber, pattern)))
            .limit(10);
        const quickRegistrations = await db_1.db
            .select({
            id: db_1.quickRegistration.id,
            givenNames: db_1.quickRegistration.givenNames,
            surname: db_1.quickRegistration.surname,
            passportNumber: db_1.quickRegistration.passportNumber,
            nationality: db_1.quickRegistration.nationality,
            passportImageUrl: db_1.quickRegistration.passportImageUrl,
        })
            .from(db_1.quickRegistration)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(db_1.quickRegistration.givenNames, pattern), (0, drizzle_orm_1.like)(db_1.quickRegistration.surname, pattern), (0, drizzle_orm_1.like)(db_1.quickRegistration.passportNumber, pattern)))
            .limit(10);
        const combined = [
            ...candidates.map(c => ({
                ...c,
                source: 'candidate',
                fullName: `${c.givenNames} ${c.surname}`.trim().toUpperCase(),
            })),
            ...quickRegistrations.map(q => ({
                ...q,
                source: 'quickRegistration',
                fullName: `${q.givenNames} ${q.surname}`.trim().toUpperCase(),
            })),
        ];
        res.json(combined.slice(0, 15));
    }
    catch (error) {
        console.error('Error searching candidates for video uploads:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
// 2. POST /api/video-uploads/save
router.post('/save', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'facePhoto', maxCount: 1 },
    { name: 'fullBodyPhoto', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id, source, passportNumber } = req.body;
        const files = req.files;
        const videoFile = files?.['video']?.[0];
        const facePhotoFile = files?.['facePhoto']?.[0];
        const fullBodyPhotoFile = files?.['fullBodyPhoto']?.[0];
        if (!videoFile) {
            return res.status(400).json({ error: 'Video file is required' });
        }
        const [finalVideoUrl, facePhoto, fullBodyPhoto] = await Promise.all([
            (0, upload_1.uploadFileFromDisk)(videoFile.path, 'videos'),
            facePhotoFile ? (0, upload_1.uploadFileFromDisk)(facePhotoFile.path, 'faces') : Promise.resolve(null),
            fullBodyPhotoFile ? (0, upload_1.uploadFileFromDisk)(fullBodyPhotoFile.path, 'fullbody') : Promise.resolve(null)
        ]);
        if (!finalVideoUrl) {
            return res.status(400).json({ error: 'Failed to process video file' });
        }
        let resolvedPassportNumber = passportNumber ? passportNumber.trim().toUpperCase() : '';
        let resolvedFullName = '';
        if (id && source) {
            if (source === 'candidate') {
                const cands = await db_1.db.select({
                    passportNumber: db_1.candidate.passportNumber,
                    givenNames: db_1.candidate.givenNames,
                    surname: db_1.candidate.surname,
                }).from(db_1.candidate).where((0, drizzle_orm_1.eq)(db_1.candidate.id, id));
                if (cands.length > 0) {
                    const cand = cands[0];
                    resolvedPassportNumber = cand.passportNumber.trim().toUpperCase();
                    resolvedFullName = `${cand.givenNames} ${cand.surname}`.trim().toUpperCase();
                }
            }
            else if (source === 'quickRegistration') {
                const qrs = await db_1.db.select({
                    passportNumber: db_1.quickRegistration.passportNumber,
                    givenNames: db_1.quickRegistration.givenNames,
                    surname: db_1.quickRegistration.surname,
                }).from(db_1.quickRegistration).where((0, drizzle_orm_1.eq)(db_1.quickRegistration.id, id));
                if (qrs.length > 0) {
                    const qr = qrs[0];
                    resolvedPassportNumber = qr.passportNumber.trim().toUpperCase();
                    resolvedFullName = `${qr.givenNames || ''} ${qr.surname || ''}`.trim().toUpperCase();
                }
            }
        }
        if (!resolvedPassportNumber && passportNumber) {
            resolvedPassportNumber = passportNumber.trim().toUpperCase();
        }
        if (!resolvedPassportNumber) {
            return res.status(400).json({ error: 'Passport number is required' });
        }
        if (!resolvedFullName) {
            const [cands] = await db_1.pool.query('SELECT givenNames, surname FROM Candidate WHERE UPPER(passportNumber) = ? LIMIT 1', [resolvedPassportNumber]);
            if (cands && cands.length > 0) {
                resolvedFullName = `${cands[0].givenNames} ${cands[0].surname}`.trim().toUpperCase();
            }
            else {
                resolvedFullName = `PASSPORT: ${resolvedPassportNumber}`;
            }
        }
        const generatedId = crypto_2.default.randomUUID ? crypto_2.default.randomUUID() : crypto_2.default.randomBytes(16).toString('hex');
        await db_1.pool.query(`INSERT INTO \`UploadedVideoProfile\` (\`id\`, \`passportNumber\`, \`fullName\`, \`videoUrl\`, \`facePhotoUrl\`, \`fullBodyPhotoUrl\`) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         \`fullName\` = VALUES(\`fullName\`),
         \`videoUrl\` = VALUES(\`videoUrl\`), 
         \`facePhotoUrl\` = VALUES(\`facePhotoUrl\`), 
         \`fullBodyPhotoUrl\` = VALUES(\`fullBodyPhotoUrl\`)`, [
            generatedId,
            resolvedPassportNumber,
            resolvedFullName,
            finalVideoUrl,
            facePhoto || null,
            fullBodyPhoto || null
        ]);
        try {
            await db_1.pool.query(`UPDATE \`Candidate\` 
         SET \`Youtube_URL\` = ?, \`facePhotoUrl\` = ?, \`fullBodyPhotoUrl\` = ?, \`allowVideo\` = 1 
         WHERE UPPER(\`passportNumber\`) = ?`, [finalVideoUrl, facePhoto || null, fullBodyPhoto || null, resolvedPassportNumber]);
        }
        catch (_) { }
        try {
            await db_1.pool.query(`UPDATE \`QuickRegistration\` 
         SET \`videoUrl\` = ?, \`allowVideo\` = 1 
         WHERE UPPER(\`passportNumber\`) = ?`, [finalVideoUrl, resolvedPassportNumber]);
        }
        catch (_) { }
        const [rawRows] = await db_1.pool.query(`SELECT * FROM \`UploadedVideoProfile\` WHERE \`passportNumber\` = ? LIMIT 1`, [resolvedPassportNumber]);
        const result = rawRows[0];
        res.json({
            success: true,
            message: 'Video & photos registered successfully',
            data: {
                ...result,
                videoUrl: (0, crypto_1.encryptPath)(result.videoUrl),
                facePhotoUrl: (0, crypto_1.encryptPath)(result.facePhotoUrl),
                fullBodyPhotoUrl: (0, crypto_1.encryptPath)(result.fullBodyPhotoUrl)
            }
        });
    }
    catch (error) {
        console.error('Error saving video upload record:', error);
        res.status(500).json({ error: error.message || 'Failed to save video record' });
    }
});
// 3. GET /api/video-uploads/match?passportNumber=...
router.get('/match', async (req, res) => {
    try {
        const passportNumber = (req.query.passportNumber || '').trim().toUpperCase();
        const givenNames = (req.query.givenNames || '').trim().toUpperCase();
        const surname = (req.query.surname || '').trim().toUpperCase();
        if (passportNumber) {
            const videos = await db_1.db.select().from(db_1.preRegisteredVideo).where((0, drizzle_orm_1.eq)(db_1.preRegisteredVideo.passportNumber, passportNumber));
            if (videos.length > 0) {
                const matchingVideo = videos[0];
                return res.json({
                    matchFound: true,
                    videoUrl: (0, crypto_1.encryptPath)(matchingVideo.videoUrl),
                    facePhotoUrl: (0, crypto_1.encryptPath)(matchingVideo.facePhotoUrl),
                    fullBodyPhotoUrl: (0, crypto_1.encryptPath)(matchingVideo.fullBodyPhotoUrl),
                    matchedName: `PASSPORT: ${matchingVideo.passportNumber}`,
                });
            }
        }
        if (givenNames || surname) {
            const fullCombined = `${givenNames} ${surname}`.trim();
            const normalizedTarget = normalizeName(fullCombined);
            const preRegistered = await db_1.db.select().from(db_1.preRegisteredVideo);
            const matchingVideo = preRegistered.find(item => {
                const normalizedItemName = normalizeName(item.passportNumber);
                return (normalizedItemName === normalizedTarget ||
                    normalizedItemName.includes(normalizedTarget) ||
                    normalizedTarget.includes(normalizedItemName));
            });
            if (matchingVideo) {
                return res.json({
                    matchFound: true,
                    videoUrl: (0, crypto_1.encryptPath)(matchingVideo.videoUrl),
                    facePhotoUrl: (0, crypto_1.encryptPath)(matchingVideo.facePhotoUrl),
                    fullBodyPhotoUrl: (0, crypto_1.encryptPath)(matchingVideo.fullBodyPhotoUrl),
                    matchedName: `PASSPORT: ${matchingVideo.passportNumber}`,
                });
            }
        }
        res.json({ matchFound: false });
    }
    catch (error) {
        console.error('Error checking video match:', error);
        res.status(500).json({ error: 'Match check failed' });
    }
});
// 4. GET /api/video-uploads/uploaded
router.get('/uploaded', async (req, res) => {
    try {
        const q = (req.query.q || '').trim().toUpperCase();
        let queryStr = 'SELECT * FROM `UploadedVideoProfile`';
        const queryParams = [];
        if (q) {
            queryStr += ' WHERE UPPER(`passportNumber`) LIKE ? OR UPPER(`fullName`) LIKE ?';
            queryParams.push(`%${q}%`, `%${q}%`);
        }
        queryStr += ' ORDER BY `createdAt` DESC';
        const [rows] = await db_1.pool.query(queryStr, queryParams);
        const results = (rows || []).map((r) => ({
            id: r.id,
            fullName: r.fullName ? r.fullName.trim().toUpperCase() : `PASSPORT: ${r.passportNumber}`,
            passportNumber: r.passportNumber || '',
            nationality: '',
            videoUrl: (0, crypto_1.encryptPath)(r.videoUrl),
            facePhotoUrl: (0, crypto_1.encryptPath)(r.facePhotoUrl),
            fullBodyPhotoUrl: (0, crypto_1.encryptPath)(r.fullBodyPhotoUrl),
            date: r.createdAt ? new Date(r.createdAt).toISOString() : '',
            source: 'candidate',
        }));
        res.json(results);
    }
    catch (error) {
        console.error('Error fetching uploaded videos:', error);
        res.status(500).json({ error: 'Failed to fetch uploaded videos' });
    }
});
// 5. PUT /api/video-uploads/:source/:id
router.put('/:source/:id', async (req, res) => {
    try {
        const { source, id } = req.params;
        const { videoUrl } = req.body;
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }
        const sanitizedVideoUrl = (0, crypto_1.sanitizeIncomingPath)(videoUrl);
        let profileUpdated = false;
        try {
            const [profiles] = await db_1.pool.query('SELECT `passportNumber` FROM `UploadedVideoProfile` WHERE `id` = ? LIMIT 1', [id]);
            if (profiles && profiles.length > 0) {
                const pNum = profiles[0].passportNumber.trim().toUpperCase();
                await db_1.pool.query('UPDATE `UploadedVideoProfile` SET `videoUrl` = ? WHERE `id` = ?', [sanitizedVideoUrl, id]);
                try {
                    await db_1.pool.query('UPDATE `Candidate` SET `Youtube_URL` = ?, `allowVideo` = 1 WHERE UPPER(`passportNumber`) = ?', [sanitizedVideoUrl, pNum]);
                }
                catch (_) { }
                try {
                    await db_1.pool.query('UPDATE `QuickRegistration` SET `videoUrl` = ?, `allowVideo` = 1 WHERE UPPER(`passportNumber`) = ?', [sanitizedVideoUrl, pNum]);
                }
                catch (_) { }
                profileUpdated = true;
            }
        }
        catch (err) {
            console.warn('Failed to update UploadedVideoProfile in PUT:', err);
        }
        if (profileUpdated) {
            return res.json({ success: true, message: 'Uploaded video profile updated successfully' });
        }
        if (source === 'candidate') {
            await db_1.db.update(db_1.candidate).set({ videoUrl: sanitizedVideoUrl }).where((0, drizzle_orm_1.eq)(db_1.candidate.id, id));
            return res.json({ success: true, message: 'Candidate video updated successfully' });
        }
        else if (source === 'quickRegistration') {
            await db_1.pool.query('UPDATE `QuickRegistration` SET `videoUrl` = ? WHERE `id` = ?', [sanitizedVideoUrl, id]);
            return res.json({ success: true, message: 'Quick registration video updated successfully' });
        }
        else if (source === 'preRegistered') {
            await db_1.db.update(db_1.preRegisteredVideo).set({ videoUrl: sanitizedVideoUrl }).where((0, drizzle_orm_1.eq)(db_1.preRegisteredVideo.id, id));
            return res.json({ success: true, message: 'Pre-registered video updated successfully' });
        }
        res.status(400).json({ error: 'Invalid source type' });
    }
    catch (error) {
        console.error('Error updating video upload:', error);
        res.status(500).json({ error: error.message || 'Failed to update video' });
    }
});
// 6. DELETE /api/video-uploads/:source/:id
router.delete('/:source/:id', async (req, res) => {
    try {
        const { source, id } = req.params;
        let profileDeleted = false;
        try {
            const [profiles] = await db_1.pool.query('SELECT `passportNumber` FROM `UploadedVideoProfile` WHERE `id` = ? LIMIT 1', [id]);
            if (profiles && profiles.length > 0) {
                const pNum = profiles[0].passportNumber.trim().toUpperCase();
                await db_1.pool.query('DELETE FROM `UploadedVideoProfile` WHERE `id` = ?', [id]);
                try {
                    await db_1.pool.query('UPDATE `Candidate` SET `Youtube_URL` = NULL, `allowVideo` = 0 WHERE UPPER(`passportNumber`) = ?', [pNum]);
                }
                catch (_) { }
                try {
                    await db_1.pool.query('UPDATE `QuickRegistration` SET `videoUrl` = NULL, `allowVideo` = 0 WHERE UPPER(`passportNumber`) = ?', [pNum]);
                }
                catch (_) { }
                profileDeleted = true;
            }
        }
        catch (err) {
            console.warn('Failed to delete UploadedVideoProfile in DELETE:', err);
        }
        if (profileDeleted) {
            return res.json({ success: true, message: 'Uploaded video profile deleted successfully' });
        }
        if (source === 'candidate') {
            await db_1.db.update(db_1.candidate).set({ videoUrl: null }).where((0, drizzle_orm_1.eq)(db_1.candidate.id, id));
            return res.json({ success: true, message: 'Candidate video removed successfully' });
        }
        else if (source === 'quickRegistration') {
            await db_1.pool.query('UPDATE `QuickRegistration` SET `videoUrl` = NULL WHERE `id` = ?', [id]);
            return res.json({ success: true, message: 'Quick registration video removed successfully' });
        }
        else if (source === 'preRegistered') {
            await db_1.db.delete(db_1.preRegisteredVideo).where((0, drizzle_orm_1.eq)(db_1.preRegisteredVideo.id, id));
            return res.json({ success: true, message: 'Pre-registered video record deleted successfully' });
        }
        res.status(400).json({ error: 'Invalid source type' });
    }
    catch (error) {
        console.error('Error deleting video upload:', error);
        res.status(500).json({ error: error.message || 'Failed to delete video' });
    }
});
exports.default = router;
