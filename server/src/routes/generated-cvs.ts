import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';

const router = Router();

// GET /api/generated-cvs
router.get('/', async (req: Request, res: Response) => {
  try {
    const generatedCVs = await prisma.generatedCV.findMany({
      include: {
        candidate: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(generatedCVs);
  } catch (error) {
    console.error('Error fetching generated CVs:', error);
    res.status(500).json({ error: 'Failed to fetch generated CVs' });
  }
});

// POST /api/generated-cvs
router.post('/', async (req: Request, res: Response) => {
  try {
    const { candidateId, templateId, facePhotoUrl, fullBodyPhotoUrl } = req.body;
    
    if (!candidateId || !templateId) {
      return res.status(400).json({ error: 'Missing candidateId or templateId' });
    }
    
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const duplicateCV = await prisma.generatedCV.findFirst({
      where: {
        candidateId: candidateId
      }
    });

    if (duplicateCV) {
      return res.status(409).json({ 
        error: 'Candidate already generated', 
        templateId: duplicateCV.templateId 
      });
    }
    
    const [faceUrl, fullBodyUrl] = await Promise.all([
      uploadToLocal(facePhotoUrl, 'faces'),
      uploadToLocal(fullBodyPhotoUrl, 'fullbody')
    ]);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const [generatedCV] = await prisma.$transaction([
      prisma.generatedCV.create({
        data: {
          candidateId,
          templateId,
          facePhotoUrl: faceUrl,
          fullBodyPhotoUrl: fullBodyUrl
        }
      }),
      prisma.candidate.update({
        where: { id: candidateId },
        data: { cvDeadline: deadline }
      })
    ]);
    
    res.json(generatedCV);
  } catch (error) {
    console.error('Error saving generated CV:', error);
    res.status(500).json({ error: 'Failed to save generated CV' });
  }
});

// PATCH /api/generated-cvs/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { templateId } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Missing templateId' });
    }
    
    const existingCV = await prisma.generatedCV.findUnique({
      where: { id }
    });
    
    if (!existingCV) {
      return res.status(404).json({ error: 'Generated CV not found' });
    }

    const duplicateCV = await prisma.generatedCV.findFirst({
      where: {
        candidateId: existingCV.candidateId,
        templateId: templateId,
        id: { not: id }
      }
    });

    if (duplicateCV) {
      return res.status(409).json({ error: 'Candidate already generated in that template' });
    }

    const updatedCV = await prisma.generatedCV.update({
      where: { id },
      data: { templateId }
    });
    
    res.json(updatedCV);
  } catch (error) {
    console.error('Error updating generated CV:', error);
    res.status(500).json({ error: 'Failed to update generated CV' });
  }
});

// DELETE /api/generated-cvs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.generatedCV.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting generated CV:', error);
    res.status(500).json({ error: 'Failed to delete generated CV' });
  }
});

export default router;
