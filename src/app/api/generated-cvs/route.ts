import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToLocal } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const generatedCVs = await prisma.generatedCV.findMany({
      include: {
        candidate: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(generatedCVs);
  } catch (error) {
    console.error('Error fetching generated CVs:', error);
    return NextResponse.json({ error: 'Failed to fetch generated CVs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { candidateId, templateId, facePhotoUrl, fullBodyPhotoUrl } = await request.json();
    
    if (!candidateId || !templateId) {
      return NextResponse.json({ error: 'Missing candidateId or templateId' }, { status: 400 });
    }
    
    // Check if candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });
    
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Check if the candidate already has a CV in ANY template
    const duplicateCV = await prisma.generatedCV.findFirst({
      where: {
        candidateId: candidateId
      }
    });

    if (duplicateCV) {
      return NextResponse.json({ 
        error: 'Candidate already generated', 
        templateId: duplicateCV.templateId 
      }, { status: 409 });
    }
    
    // Upload photos locally if they are base64
    const [faceUrl, fullBodyUrl] = await Promise.all([
      uploadToLocal(facePhotoUrl, 'faces'),
      uploadToLocal(fullBodyPhotoUrl, 'fullbody')
    ]);

    // Auto-set deadline to 30 days from now
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    // Create new generated CV record and update candidate deadline
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
    
    return NextResponse.json(generatedCV);
  } catch (error) {
    console.error('Error saving generated CV:', error);
    return NextResponse.json({ error: 'Failed to save generated CV' }, { status: 500 });
  }
}
