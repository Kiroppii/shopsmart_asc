import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { answerQuestion } from '../services/assistant.js';
import { createProviderFromEnv } from '../services/aiProvider.js';
import { assistantQuestionSchema } from '../validators/schemas.js';
const router = Router();

const assistantLimiter = rateLimit({
  windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: { code: 'TOO_MANY_QUESTIONS', message: 'Too many questions. Please wait a minute and try again.' } })
});

// Created lazily so backend/.env has been loaded first. The key never leaves this module tree.
let provider;
function getProvider() {
  if (provider === undefined) provider = createProviderFromEnv();
  return provider;
}

router.post('/questions', assistantLimiter, async (request, response, next) => {
  try {
    const parsed = assistantQuestionSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_QUESTION', message: 'Question must contain between 3 and 300 characters.' } });
    // Public catalog fields only. Orders, customers and other private records are never read here.
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, description: true, category: true, price: true, stock: true, active: true },
      orderBy: { price: 'asc' }
    });
    response.json(await answerQuestion({ products, question: parsed.data.question, provider: getProvider() }));
  } catch (error) { next(error); }
});

export default router;
