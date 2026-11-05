// Treats the AI response as an untrusted DRAFT and checks it against catalog facts.
// Returns { ok: true, answer, productIds } or { ok: false, reason }.
import { z } from 'zod';

const draftSchema = z.object({
  answer: z.string().trim().min(1).max(700),
  productIds: z.array(z.number().int().positive()).max(3)
});

const NEGATIVE_AVAILABILITY = /\b(out of stock|sold out|unavailable|not available|no longer (?:sold|available)|pre-?order|back ?order|discontinued)\b/i;
const UNSUPPORTED_OFFERS = /\b(discount|sale|promo|coupon|voucher|free shipping|free delivery|warranty|guarantee|deliver(?:y|ed) (?:in|within|by))\b/i;
const MONEY = /(?:₱|php\s?)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?|(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s?(?:php|pesos?)\b/gi;
const STOCK_COUNT = /\b(\d+)\s*(?:units?|pieces?|pcs|items?)?\s*(?:left|in stock|available|remaining)\b/gi;

function parseJson(raw) {
  const cleaned = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

function sameAmount(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.005;
}

export function verifyDraft(raw, { selected, catalog = [], question = '', budget = {} }) {
  const parsed = draftSchema.safeParse(parseJson(raw));
  if (!parsed.success) return { ok: false, reason: 'malformed_output' };
  const { answer } = parsed.data;
  const productIds = [...new Set(parsed.data.productIds)];

  // 1. Every id must belong to the products ShopSmart selected for THIS request.
  const selectedById = new Map(selected.map((product) => [product.id, product]));
  if (productIds.length === 0) return { ok: false, reason: 'no_products_named' };
  if (productIds.some((id) => !selectedById.has(id))) return { ok: false, reason: 'unknown_product_id' };
  const chosen = productIds.map((id) => selectedById.get(id));

  // 2. The answer must not name a catalog product that was not chosen (e.g. an out-of-stock one).
  const chosenIds = new Set(productIds);
  const lower = answer.toLowerCase();
  if (catalog.some((product) => !chosenIds.has(product.id) && lower.includes(product.name.toLowerCase()))) {
    return { ok: false, reason: 'unselected_product_named' };
  }
  if (/https?:\/\/|www\./i.test(answer)) return { ok: false, reason: 'link_in_answer' };

  // 3. Price claims must equal a chosen product's current price (or repeat the customer's budget).
  const allowedPrices = [...chosen.map((product) => Number(product.price)), budget.max, budget.min].filter((value) => value !== null && value !== undefined);
  const usedNumbers = [];
  for (const match of answer.matchAll(MONEY)) {
    const whole = match[1] ?? match[3];
    const cents = match[2] ?? match[4];
    const value = Number(`${whole.replaceAll(',', '')}${cents ? `.${cents}` : ''}`);
    if (!allowedPrices.some((price) => sameAmount(price, value))) return { ok: false, reason: 'unsupported_price' };
    usedNumbers.push(match[0]);
  }

  // 4. Availability claims must agree with current stock.
  if (NEGATIVE_AVAILABILITY.test(answer)) return { ok: false, reason: 'unsupported_availability' };
  for (const match of answer.matchAll(STOCK_COUNT)) {
    if (!chosen.some((product) => Number(product.stock) === Number(match[1]))) return { ok: false, reason: 'unsupported_stock_count' };
    usedNumbers.push(match[0]);
  }
  if (UNSUPPORTED_OFFERS.test(answer)) return { ok: false, reason: 'unsupported_offer' };

  // 5. Any other number (e.g. "60% layout", "2-year battery") must appear in the facts or the question.
  let remaining = answer;
  for (const used of usedNumbers) remaining = remaining.replace(used, ' ');
  const factText = `${chosen.map((p) => `${p.name} ${p.category} ${p.description}`).join(' ')} ${question}`.toLowerCase().replaceAll(',', '');
  const otherNumbers = remaining.replaceAll(',', '').match(/\d+(?:\.\d+)?/g) || [];
  if (otherNumbers.some((number) => !factText.includes(number))) return { ok: false, reason: 'unsupported_detail' };

  return { ok: true, answer, productIds };
}
