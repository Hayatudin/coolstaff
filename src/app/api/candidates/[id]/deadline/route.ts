import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { deadline } = await request.json();

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: {
        cvDeadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json({ success: true, cvDeadline: updatedCandidate.cvDeadline });
  } catch (error) {
    console.error('Error updating deadline:', error);
    return NextResponse.json(
      { error: 'Failed to update deadline', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
