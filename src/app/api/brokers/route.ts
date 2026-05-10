import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const brokers = await prisma.broker.findMany({
      include: {
        candidates: {
          select: {
            id: true,
            givenNames: true,
            surname: true,
            passportNumber: true
          }
        },
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(brokers);
  } catch (error) {
    console.error('Error fetching brokers:', error);
    return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('POST /api/brokers - Received request');
  try {
    const { name } = await request.json();
    console.log('POST /api/brokers - Name:', name);
    
    if (!name) return NextResponse.json({ error: 'Broker name is required' }, { status: 400 });

    const broker = await prisma.broker.create({
      data: { name: name.trim() },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });
    
    console.log('POST /api/brokers - Created successfully:', broker.id);
    return NextResponse.json(broker);
  } catch (error: any) {
    console.error('Error creating broker:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A broker with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create broker. Please try again.' }, { status: 500 });
  }
}

