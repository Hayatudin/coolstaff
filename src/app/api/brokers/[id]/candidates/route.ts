import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const interval = searchParams.get('interval') || 'ALL'; // 1D, 1W, 1M, 3M, 1Y, ALL
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let dateFilter = {};

    if (startDateParam || endDateParam) {
      dateFilter = {
        registeredAt: {
          ...(startDateParam ? { gte: new Date(startDateParam) } : {}),
          ...(endDateParam ? { lte: new Date(endDateParam) } : {}),
        },
      };
    } else if (interval !== 'ALL') {
      const now = new Date();
      const startDate = new Date();

      if (interval === '1D') startDate.setDate(now.getDate() - 1);
      else if (interval === '1W') startDate.setDate(now.getDate() - 7);
      else if (interval === '1M') startDate.setMonth(now.getMonth() - 1);
      else if (interval === '3M') startDate.setMonth(now.getMonth() - 3);
      else if (interval === '1Y') startDate.setFullYear(now.getFullYear() - 1);

      dateFilter = {
        registeredAt: {
          gte: startDate,
        },
      };
    }

    const broker = await prisma.broker.findUnique({
      where: { id },
      include: {
        candidates: {
          where: {
            AND: [
              {
                OR: [
                  { givenNames: { contains: search } },
                  { surname: { contains: search } },
                  { passportNumber: { contains: search } },
                ],
              },
              dateFilter,
            ],
          },
          orderBy: { registeredAt: 'desc' },
        },
      },
    });

    if (!broker) return NextResponse.json({ error: 'Broker not found' }, { status: 404 });

    return NextResponse.json(broker);
  } catch (error) {
    console.error('Error fetching broker candidates:', error);
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}
