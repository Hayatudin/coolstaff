import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    // Start of today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // End of today
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const candidates = await prisma.candidate.findMany({
      where: {
        cvDeadline: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, message: 'No deadlines today.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error('Telegram credentials missing in environment variables.');
      return NextResponse.json({ error: 'Telegram credentials missing' }, { status: 500 });
    }

    let successCount = 0;
    const errors = [];

    for (const candidate of candidates) {
      const message = `🚨 *DAERA ALERT: CV Deadline Today!* 🚨\n\n` +
                      `*Candidate:* ${candidate.givenNames} ${candidate.surname}\n` +
                      `*Passport:* ${candidate.passportNumber}\n` +
                      `*Job:* ${candidate.job || 'Not specified'}\n\n` +
                      `_Please ensure the final document has been exported and sent to the agency._`;

      try {
        await prisma.notification.create({
          data: {
            title: 'CV Deadline Reached',
            message: `The 30-day CV deadline for ${candidate.givenNames} ${candidate.surname} (${candidate.passportNumber}) has been reached. Please ensure the final document is exported.`,
            candidateId: candidate.id
          }
        });

        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          const errData = await response.text();
          errors.push(`Failed for ${candidate.id}: ${errData}`);
        }
      } catch (err: any) {
        errors.push(`Network error for ${candidate.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      notified: successCount, 
      errors: errors.length > 0 ? errors : undefined 
    });

  } catch (error) {
    console.error('Error in check-deadlines cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
