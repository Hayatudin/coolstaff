import { auth } from './lib/auth';
import prisma from './lib/prisma';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/test', async (req, res) => {
  let registeredById = req.body.registeredById || null;
  console.log("From body:", registeredById);

  try {
    const { fromNodeHeaders } = require('better-auth/node');
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    console.log("Session:", session);
    if (session?.user?.id) {
      registeredById = session.user.id;
    }
  } catch (err) {
    console.error("Session error:", err);
  }

  res.json({ registeredById });
});

app.listen(4001, () => console.log('Test server on 4001'));
