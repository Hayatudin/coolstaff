import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToLocal } from '@/lib/upload';

// GET — Fetch a single candidate by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const c = await prisma.candidate.findUnique({ 
      where: { id },
      include: { 
        broker: true,
        generatedCVs: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const candidate = {
      id: c.id,
      shelfId: c.shelfId,
      cvDeadline: c.cvDeadline?.toISOString().split('T')[0],
      passportData: {
        passportNumber: c.passportNumber,
        surname: c.surname,
        givenNames: c.givenNames,
        dateOfBirth: c.dateOfBirth.toISOString().split('T')[0],
        gender: c.gender,
        nationality: c.nationality,
        issuingCountry: c.issuingCountry,
        dateOfIssue: c.dateOfIssue.toISOString().split('T')[0],
        dateOfExpiry: c.dateOfExpiry.toISOString().split('T')[0],
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
        workExperience: c.workExperience ? (c.workExperience as any) : [],
        skills: c.skills,
        medicalStatus: c.medicalStatus,
        biometricStatus: c.biometricStatus,
        medicalDate: c.medicalDate?.toISOString().split('T')[0],
        biometricDate: c.biometricDate?.toISOString().split('T')[0],
        knownConditions: c.knownConditions,
        emergencyContactName: c.emergencyContactName,
        emergencyContactRelation: c.emergencyContactRelation,
        emergencyContactPhone: c.emergencyContactPhone,
        emergencyContactAddress: c.emergencyContactAddress,
        additionalPhones: c.additionalPhones,
        brokerId: c.brokerId || '',
      },
      passportImageUrl: c.passportImageUrl || '',
      facePhotoUrl: c.facePhotoUrl || '',
      fullBodyPhotoUrl: c.fullBodyPhotoUrl || '',
      cocDocumentUrl: c.cocDocumentUrl || '',
      medicalDocumentUrl: c.medicalDocumentUrl || '',
      candidateIdImageUrl: c.candidateIdImageUrl || '',
      relativeIdImageUrl: c.relativeIdImageUrl || '',
      labourIdUrl: c.labourIdUrl || '',
      status: c.status,
      isRequested: c.isRequested,
      visaOrContractNumber: c.visaOrContractNumber || null,
      videoUrl: c.videoUrl || null,
      registeredAt: c.registeredAt.toISOString(),
      broker: c.broker,
      latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
    };
    return NextResponse.json(candidate);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT — Update entire candidate profile (Edit Mode)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [
      passportImageUrl,
      facePhotoUrl,
      fullBodyPhotoUrl,
      cocDocumentUrl,
      medicalDocumentUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      labourIdUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo.labourIdUrl, 'labour-id')
    ]);

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        passportNumber: body.passportData.passportNumber,
        surname: body.passportData.surname,
        givenNames: body.passportData.givenNames,
        dateOfBirth: body.passportData.dateOfBirth ? new Date(body.passportData.dateOfBirth) : new Date(),
        gender: body.passportData.gender,
        nationality: body.passportData.nationality,
        issuingCountry: body.passportData.issuingCountry,
        dateOfIssue: body.passportData.dateOfIssue ? new Date(body.passportData.dateOfIssue) : new Date(),
        dateOfExpiry: body.passportData.dateOfExpiry ? new Date(body.passportData.dateOfExpiry) : new Date(),
        placeOfBirth: body.passportData.placeOfBirth,

        idNumber: body.personalInfo.idNumber,
        job: body.personalInfo.job,
        maritalStatus: body.personalInfo.maritalStatus,
        numberOfChildren: body.personalInfo.numberOfChildren,
        religion: body.personalInfo.religion,
        bloodType: body.personalInfo.bloodType,
        height: body.personalInfo.height,
        weight: body.personalInfo.weight,
        phone: body.personalInfo.phone,
        email: body.personalInfo.email,
        address: body.personalInfo.address,
        city: body.personalInfo.city,
        state: body.personalInfo.state,
        country: body.personalInfo.country,
        educationLevel: body.personalInfo.educationLevel,
        languages: body.personalInfo.languages,
        workExperience: body.personalInfo.workExperience,
        skills: body.personalInfo.skills,
        medicalStatus: body.personalInfo.medicalStatus,
        biometricStatus: body.personalInfo.biometricStatus,
        medicalDate: body.personalInfo.medicalDate ? new Date(body.personalInfo.medicalDate) : null,
        biometricDate: body.personalInfo.biometricDate ? new Date(body.personalInfo.biometricDate) : null,
        knownConditions: body.personalInfo.knownConditions,
        emergencyContactName: body.personalInfo.emergencyContactName,
        emergencyContactRelation: body.personalInfo.emergencyContactRelation,
        emergencyContactPhone: body.personalInfo.emergencyContactPhone,
        emergencyContactAddress: body.personalInfo.emergencyContactAddress,
        additionalPhones: body.personalInfo.additionalPhones || [],
        brokerId: body.personalInfo.brokerId || null,

        ...(passportImageUrl && { passportImageUrl }),
        ...(facePhotoUrl && { facePhotoUrl }),
        ...(fullBodyPhotoUrl && { fullBodyPhotoUrl }),
        ...(cocDocumentUrl && { cocDocumentUrl }),
        ...(medicalDocumentUrl && { medicalDocumentUrl }),
        ...(candidateIdImageUrl && { candidateIdImageUrl }),
        ...(relativeIdImageUrl && { relativeIdImageUrl }),
        ...(labourIdUrl && { labourIdUrl }),
        videoUrl: body.videoUrl || null,
      },
    });

    return NextResponse.json(candidate);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A candidate with this Passport Number already exists.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update candidate' },
      { status: 500 }
    );
  }
}
// PATCH — Update candidate fields (e.g. toggle isRequested)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // If marking as Unfit, also mark as requested so it acts as backup
    if (body.medicalStatus === 'Unfit') {
      body.isRequested = true;
    }

    // If restoring from backup (cancelling visa), also reset Unfit status
    if (body.isRequested === false) {
      const current = await prisma.candidate.findUnique({ where: { id }, select: { medicalStatus: true } });
      if (current?.medicalStatus === 'Unfit') {
        body.medicalStatus = 'Pending';
      }
    }

    // "When visa is selected it should remove that person's CV from those template folders. 
    // Also when it is marked as 'unfit' (the medical status is unfit), it should remove that CV."
    if (body.isRequested === true || body.medicalStatus === 'Unfit') {
      // Delete from GeneratedCV table
      await prisma.generatedCV.deleteMany({
        where: { candidateId: id }
      });
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update candidate' },
      { status: 500 }
    );
  }
}

// DELETE — Remove candidate from database
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.candidate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete candidate:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete candidate' },
      { status: 500 }
    );
  }
}
