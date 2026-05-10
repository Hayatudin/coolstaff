import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const registrations = await prisma.quickRegistration.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(registrations);
  } catch (error: any) {
    console.error('Failed to fetch quick registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch quick registrations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const registration = await prisma.quickRegistration.create({
      data: {
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
        passportImageUrl: body.passportImageUrl || null,
      },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create quick registration:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create quick registration' }, { status: 500 });
  }
}
