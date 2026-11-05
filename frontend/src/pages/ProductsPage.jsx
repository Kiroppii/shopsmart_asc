import React, { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const { addToCart, cartMessage } = useCart();
  const searchTerm = search.trim();

  useEffect(() => {
    if (categoriesLoaded) return undefined;

    let active = true;
    api.getProducts()
      .then((data) => {
        if (!active) return;
        setCategoryOptions([...new Set(data.products.map((product) => product.category))]);
        setCategoriesLoaded(true);
        setCategoryError('');
      })
      .catch((caught) => active && setCategoryError(caught.message));
    return () => { active = false; };
  }, [searchTerm, categoriesLoaded]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.getProducts(searchTerm)
      .then((data) => active && setProducts(data.products))
      .catch((caught) => active && setError(caught.message))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [searchTerm]);

  const sortedProducts = useMemo(() => products
    .filter((product) => category === 'All' || product.category === category)
    .sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    }), [products, category, sortBy]);

  const categories = ['All', ...categoryOptions];
  return (
    <section>
      <div className="hero">
        <div>
          <p className="eyebrow">BSIT FULL-STACK PROJECT</p>
          <h1>Technology for study, work and play</h1>
          <p>Browse the starter catalog, build a cart and complete a simulated order.</p>
        </div>
      </div>

      <div className="toolbar">
        <label>
          <span>Search products</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try keyboard" />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="default">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
        </label>
      </div>

      <StatusMessage>{cartMessage}</StatusMessage>
      {loading && <StatusMessage>Loading products…</StatusMessage>}
      {error && <StatusMessage type="error">{error} Make sure the backend is running.</StatusMessage>}
      {categoryError && <StatusMessage type="error">Could not load category options: {categoryError}</StatusMessage>}
      {!loading && !error && sortedProducts.length === 0 && <StatusMessage>No products match your filters.</StatusMessage>}

      <div className="product-grid">
        {!loading && !error && sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </div>
    </section>
  );
}