"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const upload_1 = require("../lib/upload");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const getNextShelfNo = async () => {
    const counterFilePath = path_1.default.join(process.cwd(), 'passport_shelf_counter.json');
    let currentCounter = 0;
    if (fs_1.default.existsSync(counterFilePath)) {
        try {
            const fileData = fs_1.default.readFileSync(counterFilePath, 'utf8');
            const parsed = JSON.parse(fileData);
            if (typeof parsed.counter === 'number') {
                currentCounter = parsed.counter;
            }
        }
        catch (e) {
            console.error('Error reading passport_shelf_counter.json:', e);
        }
    }
    try {
        const [rows] = await db_1.pool.query('SELECT MAX(CAST(shelfNo AS UNSIGNED)) AS maxShelf FROM `Passport`');
        const dbMax = rows[0]?.maxShelf ? Number(rows[0].maxShelf) : 0;
        if (dbMax > currentCounter) {
            currentCounter = dbMax;
        }
    }
    catch (dbErr) {
        console.warn('Could not query max shelfNo from Passport table:', dbErr);
    }
    const nextNum = currentCounter + 1;
    const shelfNoStr = String(nextNum).padStart(3, '0');
    try {
        fs_1.default.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), 'utf8');
    }
    catch (e) {
        console.error('Error writing passport_shelf_counter.json:', e);
    }
    return shelfNoStr;
};
// GET /api/passports
router.get('/', async (req, res) => {
    try {
        const passports = await db_1.db
            .select()
            .from(db_1.passport)
            .orderBy((0, drizzle_orm_1.desc)(db_1.passport.createdAt));
        res.json(passports);
    }
    catch (error) {
        console.error('Failed to fetch passports:', error);
        res.status(500).json({ error: 'Failed to fetch passports: ' + error.message });
    }
});
// POST /api/passports
router.post('/', async (req, res) => {
    try {
        const { passportNumber, fullName, passportImageUrl } = req.body;
        if (!passportNumber || !passportNumber.trim()) {
            return res.status(400).json({ error: 'Passport number is required' });
        }
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({ error: 'Full name is required' });
        }
        const cleanPassportNumber = passportNumber.trim().toUpperCase();
        const cleanFullName = fullName.trim().toUpperCase();
        const savedImageUrl = await (0, upload_1.uploadToLocal)(passportImageUrl, 'passports');
        const shelfNo = await getNextShelfNo();
        const id = 'pp' + (0, db_1.generateId)().slice(0, 23);
        try {
            await db_1.db.insert(db_1.passport).values({
                id,
                shelfNo,
                fullName: cleanFullName,
                passportNumber: cleanPassportNumber,
                passportImageUrl: savedImageUrl,
                status: 'Available',
            });
        }
        catch (dbErr) {
            if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.message?.includes('Duplicate entry')) {
                return res.status(400).json({ error: 'A passport with this Passport Number is already registered.' });
            }
            throw dbErr;
        }
        const [createdPassport] = await db_1.db.select().from(db_1.passport).where((0, drizzle_orm_1.eq)(db_1.passport.id, id));
        res.status(201).json(createdPassport);
    }
    catch (error) {
        console.error('Failed to create passport:', error);
        res.status(500).json({ error: 'Failed to create passport: ' + error.message });
    }
});
// PATCH /api/passports/:id/taken
router.patch('/:id/taken', async (req, res) => {
    try {
        const { id } = req.params;
        const { takenReason, takenByName, takenByPhone } = req.body;
        if (!takenReason || !['Medical', 'Terminate'].includes(takenReason)) {
            return res.status(400).json({ error: "Invalid or missing 'takenReason'. Must be 'Medical' or 'Terminate'." });
        }
        if (!takenByName || !takenByName.trim()) {
            return res.status(400).json({ error: "Person name who took the passport is required." });
        }
        if (takenReason === 'Terminate' && (!takenByPhone || !takenByPhone.trim())) {
            return res.status(400).json({ error: "Phone number is required for Terminate." });
        }
        const cleanTakerName = takenByName.trim().toUpperCase();
        const cleanTakerPhone = takenByPhone ? takenByPhone.trim() : null;
        await db_1.db.update(db_1.passport).set({
            status: 'PassportTaken',
            takenReason,
            takenByName: cleanTakerName,
            takenByPhone: cleanTakerPhone,
        }).where((0, drizzle_orm_1.eq)(db_1.passport.id, id));
        res.json({ success: true, message: 'Passport marked as taken successfully' });
    }
    catch (error) {
        console.error('Failed to mark passport as taken:', error);
        res.status(500).json({ error: 'Failed to update passport: ' + error.message });
    }
});
// PATCH /api/passports/:id/return
router.patch('/:id/return', async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.update(db_1.passport).set({
            status: 'Available',
            takenReason: null,
            takenByName: null,
            takenByPhone: null,
        }).where((0, drizzle_orm_1.eq)(db_1.passport.id, id));
        res.json({ success: true, message: 'Passport returned to available successfully' });
    }
    catch (error) {
        console.error('Failed to return passport:', error);
        res.status(500).json({ error: 'Failed to return passport: ' + error.message });
    }
});
// DELETE /api/passports/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(db_1.passport).where((0, drizzle_orm_1.eq)(db_1.passport.id, id));
        res.json({ success: true, message: 'Passport deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete passport:', error);
        res.status(500).json({ error: 'Failed to delete passport: ' + error.message });
    }
});
exports.default = router;
