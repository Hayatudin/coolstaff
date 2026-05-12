import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { templateId } = await request.json();
    const resolvedParams = await params;
    
    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
    }
    
    // Check if the current CV exists
    const existingCV = await prisma.generatedCV.findUnique({
      where: { id: resolvedParams.id }
    });
    
    if (!existingCV) {
      return NextResponse.json({ error: 'Generated CV not found' }, { status: 404 });
    }

    // Check if the candidate already has a CV in the target template
    const duplicateCV = await prisma.generatedCV.findFirst({
      where: {
        candidateId: existingCV.candidateId,
        templateId: templateId,
        id: { not: resolvedParams.id } // Exclude current record
      }
    });

    if (duplicateCV) {
      return NextResponse.json({ error: 'Candidate already generated in that template' }, { status: 409 });
    }

    const updatedCV = await prisma.generatedCV.update({
      where: { id: resolvedParams.id },
      data: { templateId }
    });
    
    return NextResponse.json(updatedCV);
  } catch (error) {
    console.error('Error updating generated CV:', error);
    return NextResponse.json({ error: 'Failed to update generated CV' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    await prisma.generatedCV.delete({
      where: { id: resolvedParams.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting generated CV:', error);
    return NextResponse.json({ error: 'Failed to delete generated CV' }, { status: 500 });
  }
}
