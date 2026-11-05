import React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

const peso = (value) => `₱${Number(value).toLocaleString('en-PH')}`;

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(event) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try { setResult(await api.askAssistant(question)); }
    catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  }

  const products = result?.recommendedProducts ?? [];
  const sources = result?.sources ?? [];

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">GROUNDED ASSISTANT</p>
        <h1>Find a product</h1>
        <p>Answers are based only on the current ShopSmart catalog. Prices and stock are checked by our server before they are shown.</p>
        <form onSubmit={ask}>
          <label>Your question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength="3" maxLength="300" placeholder="Which keyboard is below ₱2,000?" required /></label>
          <p className="field-hint">Ask about public product details only. Please do not include personal information.</p>
          <button disabled={loading}>{loading ? 'Checking the catalog…' : 'Ask ShopSmart'}</button>
        </form>
      </div>
      <div className="assistant-answer" aria-live="polite" aria-busy={loading}>
        <h2>Assistant response</h2>
        <StatusMessage type="error">{error}</StatusMessage>
        {loading && <p className="assistant-loading">Searching the catalog and checking the answer…</p>}
        {!loading && !result && !error && <p>Your answer will appear here.</p>}
        {result && <>
          <p className={`answer-badge ${result.generatedBy === 'ai-verified' ? 'ai' : 'rules'}`}>
            {result.generatedBy === 'ai-verified' ? 'AI-drafted • verified against the catalog' : 'Answer from catalog rules'}
          </p>
          <p className="assistant-text">{result.answer}</p>
          <StatusMessage type="info">{result.notice}</StatusMessage>
          {products.length > 0 && <div className="recommendations">
            {products.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                {product.name} — {peso(product.price)}
                <span className="recommendation-meta">{product.category} • {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
              </Link>
            ))}
          </div>}
          <details className="assistant-sources" open>
            <summary>Sources ({sources.length})</summary>
            {sources.length === 0
              ? <p>No catalog product supports a recommendation for this question.</p>
              : <ul>{sources.map((source) => (
                <li key={source.id}><Link to={`/products/${source.id}`}>Product #{source.id}: {source.name}</Link></li>
              ))}</ul>}
          </details>
        </>}
      </div>
    </section>
  );
}
