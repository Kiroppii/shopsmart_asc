export function parseBudget(question) {
  const normalized = question.replaceAll(',', '');
  const match = normalized.match(/(?:₱|php\s*)?(\d{2,6})(?:\.\d{1,2})?/i);
  return match ? Number(match[1]) : null;
}

export function rankProducts(products, question) {
  const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const budget = parseBudget(question);
  return products
    .filter((product) => product.stock > 0 && (budget === null || Number(product.price) <= budget))
    .map((product) => {
      const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      return { ...product, score: terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0) };
    })
    .sort((a, b) => b.score - a.score || Number(a.price) - Number(b.price));
}

export function buildAssistantResponse(products, question) {
  const ranked = rankProducts(products, question).slice(0, 3);
  if (ranked.length === 0) {
    return { answer: 'I could not find an in-stock product matching that request.', recommendedProducts: [], sources: [] };
  }
  const names = ranked.map((product) => product.name).join(', ');
  return {
    answer: `Based on the current ShopSmart catalog, consider: ${names}. This starter response uses rules rather than a generative AI model.`,
    recommendedProducts: ranked.map(({ id, name, price, category }) => ({ id, name, price: Number(price), category })),
    sources: ranked.map(({ id, name }) => ({ type: 'product', id, name }))
  };
}
