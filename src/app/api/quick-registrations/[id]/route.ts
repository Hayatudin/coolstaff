import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registration = await prisma.quickRegistration.findUnique({
      where: { id },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(registration);
  } catch (error: any) {
    console.error('Failed to fetch quick registration:', error);
    return NextResponse.json({ error: 'Failed to fetch quick registration' }, { status: 500 });
  }
}
