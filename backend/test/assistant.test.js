import test from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion, buildAssistantResponse, NO_MATCH_ANSWER, parseBudget, rankProducts } from '../src/services/assistant.js';
import { redactPersonalData, selectProducts, toProviderFacts } from '../src/services/retrieval.js';
import { verifyDraft } from '../src/services/verifier.js';
import { createGeminiProvider, ProviderError } from '../src/services/aiProvider.js';

const products = [
  { id: 1, name: 'Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: 1800, stock: 2 },
  { id: 2, name: 'Mouse', category: 'Accessories', description: 'Wireless mouse', price: 600, stock: 3 }
];

// Mirrors the seeded catalog. Prices are strings here to imitate Prisma Decimal values.
const catalog = [
  { id: 11, name: 'Wireless Mouse', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', category: 'Accessories', price: '650.00', stock: 12, active: true },
  { id: 12, name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', price: '1850.00', stock: 8, active: true },
  { id: 13, name: 'USB-C Study Lamp', description: 'Adjustable desk lamp with three brightness levels.', category: 'Study', price: '900.00', stock: 10, active: true },
  { id: 14, name: '1080p Webcam', description: 'Full HD webcam with privacy cover and built-in microphone.', category: 'Video', price: '1450.00', stock: 6, active: true },
  { id: 15, name: 'Laptop Stand', description: 'Foldable aluminum stand for laptops up to 16 inches.', category: 'Study', price: '1200.00', stock: 9, active: true },
  { id: 16, name: 'USB Headset', description: 'Over-ear headset with noise-reducing boom microphone.', category: 'Audio', price: '1350.00', stock: 7, active: true }
];
const KEYBOARD_Q = 'Which keyboard is below ₱2,000?';
const fakeProvider = (reply) => ({ calls: 0, async draft() { this.calls += 1; return typeof reply === 'function' ? reply() : JSON.stringify(reply); } });
const silent = () => {};

// --- existing starter behaviour -------------------------------------------
test('parseBudget extracts a peso budget', () => assert.equal(parseBudget('below ₱2,000'), 2000));
test('rankProducts respects the budget', () => assert.deepEqual(rankProducts(products, 'mouse below 700').map((p) => p.id), [2]));
test('assistant response contains traceable sources', () => assert.equal(buildAssistantResponse(products, 'keyboard').sources[0].id, 1));

// --- retrieval -------------------------------------------------------------
test('product numbers such as 1080p are not treated as a budget', () => {
  assert.equal(parseBudget('Is there a 1080p webcam?'), null);
  assert.deepEqual(selectProducts(catalog, 'Is there a 1080p webcam?').map((p) => p.id), [14]);
});
test('budget shorthand like 2k is understood', () => assert.equal(parseBudget('keyboard under 2k'), 2000));
test('keyboard question selects only the keyboard', () => assert.deepEqual(selectProducts(catalog, KEYBOARD_Q).map((p) => p.id), [12]));
test('a product type we do not sell selects nothing', () => assert.deepEqual(selectProducts(catalog, 'Do you sell camping tents?'), []));
test('a budget-only question lists in-stock products within budget', () => {
  assert.deepEqual(selectProducts(catalog, 'Anything under ₱1,000?').map((p) => p.id), [11, 13]);
});
test('out-of-stock and inactive products are never selected', () => {
  const changed = catalog.map((p) => (p.id === 12 ? { ...p, stock: 0 } : p.id === 14 ? { ...p, active: false } : p));
  assert.deepEqual(selectProducts(changed, KEYBOARD_Q), []);
  assert.deepEqual(selectProducts(changed, 'webcam'), []);
});
test('provider facts contain only public fields and a numeric price', () => {
  assert.deepEqual(toProviderFacts(catalog[1]), { id: 12, name: 'Compact Mechanical Keyboard', category: 'Accessories', description: 'Hot-swappable compact keyboard with tactile switches.', pricePHP: 1850, inStock: true, stock: 8 });
});
test('emails and phone numbers are removed before the provider sees the question', () => {
  const cleaned = redactPersonalData('I am ana@example.com, 09171234567, need a keyboard');
  assert.ok(!cleaned.includes('ana@example.com') && !cleaned.includes('09171234567'));
});

// --- verification ----------------------------------------------------------
const selectedKeyboard = [catalog[1]];
const ctx = { selected: selectedKeyboard, catalog, question: KEYBOARD_Q, budget: { max: 2000, min: null } };
test('a supported draft passes verification', () => {
  const result = verifyDraft(JSON.stringify({ answer: 'The Compact Mechanical Keyboard costs ₱1,850, under your ₱2,000 budget, and has 8 in stock.', productIds: [12] }), ctx);
  assert.equal(result.ok, true);
});
test('an invented product id is rejected', () => assert.equal(verifyDraft(JSON.stringify({ answer: 'Try product 99.', productIds: [99] }), ctx).reason, 'unknown_product_id'));
test('a wrong price is rejected', () => assert.equal(verifyDraft(JSON.stringify({ answer: 'It costs ₱1,500.', productIds: [12] }), ctx).reason, 'unsupported_price'));
test('a false availability claim is rejected', () => assert.equal(verifyDraft(JSON.stringify({ answer: 'It is sold out.', productIds: [12] }), ctx).reason, 'unsupported_availability'));
test('an invented specification is rejected', () => assert.equal(verifyDraft(JSON.stringify({ answer: 'It has a 60% layout and RGB.', productIds: [12] }), ctx).reason, 'unsupported_detail'));
test('naming a product that was not selected is rejected', () => assert.equal(verifyDraft(JSON.stringify({ answer: 'Pair it with the Wireless Mouse.', productIds: [12] }), ctx).reason, 'unselected_product_named'));
test('malformed output is rejected', () => assert.equal(verifyDraft('Sure! Here is a keyboard.', ctx).reason, 'malformed_output'));

// --- full service ----------------------------------------------------------
test('catalog match: verified AI draft is returned with catalog price and valid sources', async () => {
  const provider = fakeProvider({ answer: 'The Compact Mechanical Keyboard is ₱1,850 and in stock.', productIds: [12] });
  const result = await answerQuestion({ products: catalog, question: KEYBOARD_Q, provider, log: silent });
  assert.equal(result.generatedBy, 'ai-verified');
  assert.deepEqual(result.recommendedProducts, [{ id: 12, name: 'Compact Mechanical Keyboard', price: 1850, category: 'Accessories', stock: 8 }]);
  assert.deepEqual(result.sources, [{ type: 'product', id: 12, name: 'Compact Mechanical Keyboard' }]);
});
test('no match: honest answer and the provider is never called', async () => {
  const provider = fakeProvider({ answer: 'We have great tents!', productIds: [11] });
  const result = await answerQuestion({ products: catalog, question: 'Do you sell camping tents?', provider, log: silent });
  assert.equal(provider.calls, 0);
  assert.equal(result.answer, NO_MATCH_ANSWER);
  assert.deepEqual([result.recommendedProducts, result.sources], [[], []]);
});
test('unverifiable draft is replaced by the rule-based answer', async () => {
  const provider = fakeProvider({ answer: 'The keyboard is on sale for ₱999!', productIds: [12] });
  const result = await answerQuestion({ products: catalog, question: KEYBOARD_Q, provider, log: silent });
  assert.equal(result.generatedBy, 'rules');
  assert.match(result.answer, /₱1,850/);
  assert.match(result.notice, /could not be verified/);
});
for (const kind of ['timeout', 'rate_limit', 'unavailable', 'not_configured']) {
  test(`provider failure (${kind}) falls back to catalog rules`, async () => {
    const provider = fakeProvider(() => { throw new ProviderError(kind, 'test'); });
    const result = await answerQuestion({ products: catalog, question: KEYBOARD_Q, provider, log: silent });
    assert.equal(result.generatedBy, 'rules');
    assert.equal(result.sources[0].id, 12);
    assert.ok(result.notice);
  });
}

// --- provider adapter ------------------------------------------------------
test('Gemini adapter sends the key in a header and parses Interactions output', async () => {
  let seen;
  const fetchImpl = async (url, options) => {
    seen = { url, options };
    return new Response(JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"answer":"ok","productIds":[12]}' }] }] }), { status: 200 });
  };
  const provider = createGeminiProvider({ apiKey: 'test-key', model: 'm', baseUrl: 'https://example.test', fetchImpl });
  assert.equal(await provider.draft('q', []), '{"answer":"ok","productIds":[12]}');
  assert.equal(seen.options.headers['x-goog-api-key'], 'test-key');
  assert.ok(!seen.url.includes('test-key'));
});
test('Gemini adapter maps HTTP 429 to a rate_limit error', async () => {
  const provider = createGeminiProvider({ apiKey: 'k', fetchImpl: async () => new Response('{}', { status: 429 }), log: () => {} });
  await assert.rejects(provider.draft('q', []), (error) => error.kind === 'rate_limit' && !error.message.includes('k '));
});
test('Gemini adapter without a key reports not_configured without any network call', async () => {
  let called = false;
  const provider = createGeminiProvider({ apiKey: '', fetchImpl: async () => { called = true; } });
  await assert.rejects(provider.draft('q', []), (error) => error.kind === 'not_configured');
  assert.equal(called, false);
});
test('an overloaded model (HTTP 503) falls through to the next backup model', async () => {
  const tried = [];
  const fetchImpl = async (_url, options) => {
    const { model } = JSON.parse(options.body);
    tried.push(model);
    if (model === 'busy-model') return new Response('{"error":{"status":"UNAVAILABLE"}}', { status: 503 });
    return new Response(JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"answer":"ok","productIds":[12]}' }] }] }), { status: 200 });
  };
  const provider = createGeminiProvider({ apiKey: 'k', model: 'busy-model', fallbackModels: ['backup-model'], fetchImpl, log: () => {} });
  assert.equal(await provider.draft('q', []), '{"answer":"ok","productIds":[12]}');
  assert.deepEqual(tried, ['busy-model', 'backup-model']);
});
test('a wrong model name (HTTP 404) is reported instead of silently switching models', async () => {
  const provider = createGeminiProvider({ apiKey: 'k', model: 'typo', fallbackModels: ['backup'], fetchImpl: async () => new Response('{}', { status: 404 }), log: () => {} });
  await assert.rejects(provider.draft('q', []), (error) => error.kind === 'unavailable' && /404/.test(error.message));
});
