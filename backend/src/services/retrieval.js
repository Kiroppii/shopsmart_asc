// Catalog retrieval: decides which products are eligible for a question
// BEFORE any AI provider is involved. Only this code chooses catalog facts.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'any', 'can', 'get', 'has', 'have', 'there',
  'which', 'what', 'who', 'how', 'does', 'that', 'this', 'these', 'those', 'one', 'ones',
  'below', 'under', 'less', 'than', 'over', 'above', 'more', 'most', 'least', 'within', 'max', 'maximum', 'upto',
  'price', 'priced', 'cost', 'costs', 'cheap', 'cheaper', 'cheapest', 'budget', 'affordable', 'expensive',
  'php', 'peso', 'pesos', 'product', 'products', 'item', 'items', 'thing', 'things', 'something', 'anything', 'option', 'options', 'offer',
  'recommend', 'recommendation', 'suggest', 'need', 'want', 'looking', 'look', 'buy', 'sell', 'selling',
  'good', 'best', 'nice', 'great', 'please', 'show', 'find', 'help', 'available', 'stock', 'shopsmart', 'store', 'shop'
]);

// Small, explicit synonym map so common wording still reaches catalog words.
const SYNONYMS = {
  mice: 'mouse', keyboards: 'keyboard', headphones: 'headset', headphone: 'headset', earphones: 'headset',
  camera: 'webcam', cam: 'webcam', light: 'lamp', notebook: 'laptop'
};

function singular(word) {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function normalizeWord(word) {
  return singular(SYNONYMS[word] || word);
}

export function tokenize(text) {
  return String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Words in the question that describe WHAT the customer wants (not filler, not prices).
export function meaningfulTerms(question) {
  const withoutMoney = String(question).replace(/(?:₱|php)\s*[\d,]+(?:\.\d+)?k?/gi, ' ');
  return [...new Set(tokenize(withoutMoney)
    .filter((term) => term.length > 2 && !STOPWORDS.has(term) && !/^\d+$/.test(term))
    .map(normalizeWord))];
}

function toAmount(digits, thousands) {
  const value = Number(String(digits).replaceAll(',', ''));
  return thousands ? value * 1000 : value;
}

// A number only counts as a budget when the question signals money or a limit,
// so "1080p webcam" or "16 inch laptop" are not mistaken for prices.
export function parsePriceRange(question) {
  const text = String(question).toLowerCase();
  const amount = String.raw`(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\s*(k\b)?`;
  const maxCue = String.raw`(?:under|below|less than|cheaper than|at most|no more than|not more than|max(?:imum)?(?: of)?|up to|budget(?: of| is)?|within)`;
  const minCue = String.raw`(?:over|above|more than|at least|minimum(?: of)?)`;
  const currency = String.raw`(?:₱|php)`;

  const maxMatch = text.match(new RegExp(`${maxCue}\\s*${currency}?\\s*${amount}`));
  const minMatch = text.match(new RegExp(`${minCue}\\s*${currency}?\\s*${amount}`));
  let max = maxMatch ? toAmount(maxMatch[1], maxMatch[2]) : null;
  const min = minMatch ? toAmount(minMatch[1], minMatch[2]) : null;

  if (max === null && min === null) {
    const plain = text.match(new RegExp(`${currency}\\s*${amount}`)) || text.match(new RegExp(`${amount}\\s*(?:php|pesos?)\\b`));
    if (plain) max = toAmount(plain[1], plain[2]);
  }
  return { max, min };
}

export function parseBudget(question) {
  return parsePriceRange(question).max;
}

// Products a customer may be offered at all: active and actually in stock.
export function isRecommendable(product) {
  return product.active !== false && Number(product.stock) > 0;
}

export function scoreProduct(product, terms) {
  const words = new Set(tokenize(`${product.name} ${product.category} ${product.description}`).map(normalizeWord));
  return terms.reduce((score, term) => score + (words.has(term) ? 1 : 0), 0);
}

// Returns at most `limit` eligible products, best match first.
// If the customer named something we do not stock, the result is empty (honest no match).
export function selectProducts(products, question, limit = 3) {
  const terms = meaningfulTerms(question);
  const { max, min } = parsePriceRange(question);
  const scored = products
    .filter(isRecommendable)
    .filter((product) => (max === null || Number(product.price) <= max) && (min === null || Number(product.price) >= min))
    .map((product) => ({ product, score: scoreProduct(product, terms) }));

  // With descriptive words, require a real match. With only a budget ("anything under ₱1,000?"), list by price.
  const matches = terms.length > 0 ? scored.filter((entry) => entry.score > 0) : scored;
  if (matches.length === 0) return [];
  const topScore = Math.max(...matches.map((entry) => entry.score));
  // Keep products that match as strongly as the best one, so a keyboard question does not also list a mouse.
  return matches
    .filter((entry) => terms.length === 0 || entry.score === topScore)
    .sort((a, b) => Number(a.product.price) - Number(b.product.price))
    .slice(0, limit)
    .map((entry) => entry.product);
}

// The ONLY product data that leaves the server. Prisma returns price as a Decimal,
// so convert it deliberately to a 2-decimal number.
export function toProviderFacts(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    pricePHP: Math.round(Number(product.price) * 100) / 100,
    inStock: Number(product.stock) > 0,
    stock: Number(product.stock)
  };
}

// Remove things that look like personal data before a question leaves ShopSmart.
export function redactPersonalData(question) {
  return String(question)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email removed]')
    .replace(/(?:\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, '[phone removed]')
    .replace(/\b\d{10,}\b/g, '[number removed]');
}
