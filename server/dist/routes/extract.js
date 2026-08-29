"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const musaned_1 = require("../lib/parsers/musaned");
const pdfParse = require('pdf-parse');
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)();
router.post('/musaned', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        if (file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: 'File must be a PDF' });
        }
        const pdfData = await pdfParse(file.buffer);
        const extractedData = (0, musaned_1.parseMusanedText)(pdfData.text);
        res.json({
            success: true,
            rawText: pdfData.text,
            data: extractedData
        });
    }
    catch (error) {
        console.error('Error extracting Musaned PDF:', error);
        res.status(500).json({ error: 'Failed to process the PDF document.' });
    }
});
exports.default = router;
