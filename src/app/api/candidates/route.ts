import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToLocal } from '@/lib/upload';

export async function GET() {
  try {
    const dbCandidates = await prisma.candidate.findMany({
      orderBy: { registeredAt: 'desc' },
      include: {
        generatedCVs: { select: { templateId: true } }
      }
    });

    // Map flat DB structure to nested UI structure
    const candidates = dbCandidates.map(c => ({
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
      registeredAt: c.registeredAt.toISOString(),
      status: c.status,
      generatedCVs: c.generatedCVs?.map(cv => cv.templateId) || [],
    }));

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Run all uploads and db queries in parallel to eliminate waterfall delay
    const [
      passportImageUrl,
      facePhotoUrl,
      fullBodyPhotoUrl,
      cocDocumentUrl,
      medicalDocumentUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      labourIdUrl,
      count
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo.labourIdUrl, 'labour-id'),
      prisma.candidate.count()
    ]);

    // Generate sequential shelf ID (e.g., 001, 002)
    const nextShelfId = body.shelfId || String(count + 1).padStart(3, '0');

    // Map nested UI structure to flat DB structure
    const candidate = await prisma.candidate.create({
      data: {
        shelfId: nextShelfId,
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

        passportImageUrl,
        facePhotoUrl,
        fullBodyPhotoUrl,
        cocDocumentUrl,
        medicalDocumentUrl,
        candidateIdImageUrl,
        relativeIdImageUrl,
        labourIdUrl,
        videoUrl: body.videoUrl || null,
        status: body.status || 'pending',
      },
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create candidate:', error);

    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A candidate with this Passport Number already exists in the system.' }, { status: 400 });
    }

    return NextResponse.json({ error: error?.message || 'Failed to create candidate' }, { status: 500 });
  }
}
