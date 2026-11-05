// Assistant service: retrieval -> optional AI draft -> verification -> response.
// ShopSmart code decides which products are eligible and builds recommendedProducts
// and sources from catalog records, never from the model's text.
import { parseBudget, parsePriceRange, redactPersonalData, selectProducts, toProviderFacts } from './retrieval.js';
import { verifyDraft } from './verifier.js';

export { parseBudget };

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatPeso = (value) => peso.format(Number(value));

export const NO_MATCH_ANSWER = 'I could not find an active, in-stock ShopSmart product that matches that request. Try a different product type or a higher budget.';

const FALLBACK_NOTICES = {
  not_configured: 'AI drafting is not configured, so this answer was written from catalog rules.',
  disabled: 'AI drafting is turned off, so this answer was written from catalog rules.',
  timeout: 'The AI service took too long, so this answer was written from catalog rules.',
  rate_limit: 'The AI service is busy right now, so this answer was written from catalog rules.',
  unavailable: 'The AI service is unavailable right now, so this answer was written from catalog rules.',
  bad_response: 'The AI service returned an unusable reply, so this answer was written from catalog rules.',
  unverified: 'The AI draft could not be verified against the catalog, so this answer was written from catalog rules.'
};

// Kept for the existing tests and as the rule-based ranking entry point.
export function rankProducts(products, question) {
  return selectProducts(products, question, products.length);
}

function describe(product) {
  return `${product.name} (${formatPeso(product.price)}, ${product.stock} in stock)`;
}

function shape(products, answer, extra = {}) {
  return {
    answer,
    recommendedProducts: products.map(({ id, name, price, category, stock }) => ({ id, name, price: Number(price), category, stock: Number(stock) })),
    sources: products.map(({ id, name }) => ({ type: 'product', id, name })),
    ...extra
  };
}

// Rule-based answer: always available, uses only verified catalog facts.
export function buildAssistantResponse(products, question) {
  const selected = selectProducts(products, question);
  if (selected.length === 0) return shape([], NO_MATCH_ANSWER, { generatedBy: 'rules' });
  const list = selected.map(describe).join('; ');
  const lead = selected.length === 1 ? 'From the current ShopSmart catalog, this product matches your request:' : 'From the current ShopSmart catalog, these products match your request:';
  return shape(selected, `${lead} ${list}.`, { generatedBy: 'rules' });
}

function fallback(selected, question, reason, log) {
  log(`[assistant] AI draft not used: ${reason}`);
  const kind = FALLBACK_NOTICES[reason] ? reason : 'unverified';
  return { ...buildAssistantResponse(selected, question), notice: FALLBACK_NOTICES[kind] };
}

export async function answerQuestion({ products, question, provider, log = console.warn }) {
  const selected = selectProducts(products, question);

  // No eligible product: answer honestly and do NOT call the provider.
  if (selected.length === 0) return shape([], NO_MATCH_ANSWER, { generatedBy: 'rules' });
  if (!provider) return fallback(selected, question, 'disabled', log);

  let raw;
  try {
    raw = await provider.draft(redactPersonalData(question), selected.map(toProviderFacts));
  } catch (error) {
    log(`[assistant] provider error: ${error?.message || 'unknown'}`);
    return fallback(selected, question, error?.kind || 'unavailable', log);
  }

  const verdict = verifyDraft(raw, { selected, catalog: products, question, budget: parsePriceRange(question) });
  if (!verdict.ok) {
    log(`[assistant] AI draft rejected: ${verdict.reason}`);
    return fallback(selected, question, 'unverified', () => {});
  }

  const chosen = verdict.productIds.map((id) => selected.find((product) => product.id === id));
  return shape(chosen, verdict.answer, { generatedBy: 'ai-verified' });
}
