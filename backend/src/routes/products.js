import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const search = String(request.query.search || '').trim();
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      orderBy: { id: 'asc' }
    });
    response.json({ products: products.map((p) => ({ ...p, price: Number(p.price) })) });
  } catch (error) { next(error); }
});

router.get('/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return response.status(400).json({ error: { code: 'INVALID_PRODUCT_ID', message: 'Product ID must be a positive integer.' } });
    const product = await prisma.product.findFirst({ where: { id, active: true } });
    if (!product) return response.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product could not be found.' } });
    response.json({ ...product, price: Number(product.price) });
  } catch (error) { next(error); }
});

// WEEK 4 IMPROVEMENT: Add authentication, administrator authorization and a validated POST route.
export default router;
