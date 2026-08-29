"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mrz_1 = require("../lib/utils/mrz");
const router = (0, express_1.Router)();
router.post('/passport', async (req, res) => {
    try {
        const { ocrText } = req.body;
        if (!ocrText)
            return res.status(400).json({ error: 'No OCR text provided' });
        // Attempt primary MRZ extraction
        let mrz = (0, mrz_1.findMrzLines)(ocrText);
        // If MRZ not detected, log OCR text and retry with cleaned input
        if (!mrz) {
            console.warn('MRZ not detected, logging OCR text for investigation');
            console.debug('OCR Text:', ocrText);
            const cleanedOcr = ocrText.replace(/[^\x00-\x7F]/g, '');
            mrz = (0, mrz_1.findMrzLines)(cleanedOcr);
        }
        if (!mrz) {
            return res.status(422).json({ error: 'MRZ not detected – please retake the passport photo' });
        }
        const [line1, line2] = mrz;
        // Normalize and correct misread chevrons in MRZ line 1 using the advanced structural recovery logic
        let cleanedLine1 = (0, mrz_1.preCleanMrzLine1)(line1);
        const issuingCountry = cleanedLine1.substring(2, 5).replace(/</g, '');
        const parts = cleanedLine1.substring(5).split('<<');
        const surname = (0, mrz_1.cleanName)(parts[0] || '');
        const rawGivenNames = parts.slice(1).join('<<');
        const givenNames = (0, mrz_1.recoverGivenNames)(rawGivenNames);
        // Dynamically anchor parser fields based on nationality country code position to make it resilient to character insertion/deletion shifts
        const anchorIdx = (0, mrz_1.findCountryCodeAnchor)(line2);
        let rawPassportNumber = line2.substring(0, anchorIdx).replace(/</g, '');
        if (rawPassportNumber.length > 9) {
            rawPassportNumber = rawPassportNumber.substring(0, 9);
        }
        const passportNumber = (0, mrz_1.cleanPassportNumber)(rawPassportNumber);
        const nationality = line2.substring(anchorIdx, anchorIdx + 3).replace(/</g, '');
        // Use the extremely robust layout-independent dates and gender extraction scanner on the rest of the MRZ line
        const restOfLine = line2.substring(anchorIdx + 3);
        const { dateOfBirth, gender, dateOfExpiry } = (0, mrz_1.extractDatesAndGender)(restOfLine);
        const result = {
            passportNumber,
            surname,
            givenNames,
            dateOfBirth,
            gender,
            nationality: mrz_1.COUNTRY_MAP[nationality || issuingCountry] || nationality || issuingCountry,
            dateOfExpiry,
        };
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to parse passport' });
    }
});
exports.default = router;
