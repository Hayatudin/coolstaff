import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';

const router = Router();

async function isCandidateBrokerLocked(candidateId: string): Promise<{ locked: boolean; brokerName?: string }> {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { broker: { select: { isLocked: true, name: true } } }
    });
    if (candidate?.broker?.isLocked) {
      return { locked: true, brokerName: candidate.broker.name };
    }
  } catch (_) {}
  return { locked: false };
}

const formatCandidate = (c: any) => {
  if (!c) return null;
  const formatDate = (date: Date | null | undefined) => date?.toISOString().split('T')[0] || '';
  return {
    id: c.id,
    shelfId: c.shelfId,
    cvDeadline: formatDate(c.cvDeadline),
    passportData: {
      passportNumber: c.passportNumber,
      surname: c.surname,
      givenNames: c.givenNames,
      dateOfBirth: formatDate(c.dateOfBirth),
      gender: c.gender,
      nationality: c.nationality,
      issuingCountry: c.issuingCountry,
      dateOfIssue: formatDate(c.dateOfIssue),
      dateOfExpiry: formatDate(c.dateOfExpiry),
      placeOfBirth: c.placeOfBirth,
    },
    personalInfo: {
      idNumber: c.idNumber || c.passportNumber,
      job: c.job || '',
      maritalStatus: c.maritalStatus,
      numberOfChildren: c.numberOfChildren,
      religion: c.religion,
      bloodType: c.bloodType,
      height: c.height,
      weight: c.weight,
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      educationLevel: c.educationLevel,
      languages: c.languages,
      workExperience: c.workExperience || [],
      skills: c.skills,
      medicalStatus: c.medicalStatus,
      biometricStatus: c.biometricStatus,
      medicalDate: formatDate(c.medicalDate),
      biometricDate: formatDate(c.biometricDate),
      knownConditions: c.knownConditions,
      emergencyContactName: c.emergencyContactName,
      emergencyContactRelation: c.emergencyContactRelation,
      emergencyContactPhone: c.emergencyContactPhone,
      emergencyContactAddress: c.emergencyContactAddress,
      additionalPhones: c.additionalPhones,
      brokerId: c.brokerId || '',
      cocDocumentUrl: c.cocDocumentUrl || '',
      medicalDocumentUrl: c.medicalDocumentUrl || '',
      candidateIdImageUrl: c.candidateIdImageUrl || '',
      relativeIdImageUrl: c.relativeIdImageUrl || '',
      labourIdUrl: c.labourIdUrl || '',
      salary: c.salary || '1000SR',
    },
    brokerId: c.brokerId,
    passportImageUrl: c.passportImageUrl || '',
    facePhotoUrl: c.facePhotoUrl || '',
    fullBodyPhotoUrl: c.fullBodyPhotoUrl || '',
    cocDocumentUrl: c.cocDocumentUrl || '',
    medicalDocumentUrl: c.medicalDocumentUrl || '',
    candidateIdImageUrl: c.candidateIdImageUrl || '',
    relativeIdImageUrl: c.relativeIdImageUrl || '',
    labourIdUrl: c.labourIdUrl || '',
    isRequested: c.isRequested || false,
    visaOrContractNumber: c.visaOrContractNumber || null,
    isFlagged: c.isFlagged || false,
    videoUrl: c.videoUrl || null,
    registeredAt: c.registeredAt instanceof Date ? c.registeredAt.toISOString() : c.registeredAt,
    status: c.status,
    visaSelected: c.visaSelected,
    visaDate: c.visaDate ? (c.visaDate instanceof Date ? c.visaDate.toISOString() : c.visaDate) : null,
    salary: c.salary || '1000SR',
  };
};

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
    
    const mappedCVs = generatedCVs.map((cv: any) => ({
      ...cv,
      candidate: formatCandidate(cv.candidate)
    }));
    
    res.json(mappedCVs);
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

    // Check if broker is locked
    const lockStatus = await isCandidateBrokerLocked(candidateId);
    if (lockStatus.locked) {
      return res.status(403).json({ error: `This candidate's broker (${lockStatus.brokerName}) is locked. CV generation is not allowed.` });
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

    // Check if broker is locked
    const lockStatus = await isCandidateBrokerLocked(existingCV.candidateId);
    if (lockStatus.locked) {
      return res.status(403).json({ error: `This candidate's broker (${lockStatus.brokerName}) is locked. CV modifications are not allowed.` });
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
    
    const existingCV = await prisma.generatedCV.findUnique({
      where: { id }
    });
    
    if (!existingCV) {
      return res.status(404).json({ error: 'Generated CV not found' });
    }

    // Check if broker is locked
    const lockStatus = await isCandidateBrokerLocked(existingCV.candidateId);
    if (lockStatus.locked) {
      return res.status(403).json({ error: `This candidate's broker (${lockStatus.brokerName}) is locked. CV deletion is not allowed.` });
    }

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
