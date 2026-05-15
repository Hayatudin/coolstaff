import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/cron/check-deadlines
router.get('/check-deadlines', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
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
      return res.json({ success: true, message: 'No deadlines today.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({ error: 'Telegram credentials missing' });
    }

    let successCount = 0;
    const errors = [];

    for (const candidate of candidates) {
      const message = `🚨 *COOLSTAFF ALERT: CV Deadline Today!* 🚨\n\n` +
                      `*Candidate:* ${candidate.givenNames} ${candidate.surname}\n` +
                      `*Passport:* ${candidate.passportNumber}\n` +
                      `*Job:* ${candidate.job || 'Not specified'}\n\n` +
                      `_Please ensure the final document has been exported and sent to the agency._`;

      try {
        await prisma.notification.create({
          data: {
            title: 'CV Deadline Reached',
            message: `The 30-day CV deadline for ${candidate.givenNames} ${candidate.surname} (${candidate.passportNumber}) has been reached.`,
            candidateId: candidate.id
          }
        });

        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
        });

        if (response.ok) successCount++;
        else errors.push(`Failed for ${candidate.id}`);
      } catch (err: any) {
        errors.push(`Network error for ${candidate.id}`);
      }
    }

    res.json({ success: true, notified: successCount, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('Error in check-deadlines cron:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
