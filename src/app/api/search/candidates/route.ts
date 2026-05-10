import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const candidates = await prisma.candidate.findMany({
      where: {
        OR: [
          { givenNames: { contains: query } },
          { surname: { contains: query } },
          { passportNumber: { contains: query } },
        ],
      },
      take: 5,
      select: {
        id: true,
        givenNames: true,
        surname: true,
        passportNumber: true,
        facePhotoUrl: true,
        job: true,
      },
    });

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
