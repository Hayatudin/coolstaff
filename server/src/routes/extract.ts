import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseMusanedText } from '../lib/parsers/musaned';
const pdfParse = require('pdf-parse');

const router = Router();
const upload = multer();

router.post('/musaned', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'File must be a PDF' });
    }

    const pdfData = await pdfParse(file.buffer);
    const extractedData = parseMusanedText(pdfData.text);

    res.json({
      success: true,
      rawText: pdfData.text,
      data: extractedData
    });
  } catch (error: any) {
    console.error('Error extracting Musaned PDF:', error);
    res.status(500).json({ error: 'Failed to process the PDF document.' });
  }
});

export default router;
