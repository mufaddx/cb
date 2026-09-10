"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: string | null;
  inventory: number;
  archived: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [inventory, setInventory] = useState("");

  function load() {
    apiFetch<Product[]>("/api/products")
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load products."));
  }
  useEffect(load, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: {
          name,
          sku: sku || undefined,
          price: price ? Number(price) : undefined,
          inventory: inventory ? Number(inventory) : 0,
        },
      });
      setName("");
      setSku("");
      setPrice("");
      setInventory("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function archive(id: string) {
    try {
      await apiFetch(`/api/products/${id}/archive`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }

  return (
    <>
      <main style={{ padding: "32px" }}>
        <p className="helper-text" style={{ marginBottom: 20 }}>Ship these to creators for a Creator Content campaign that includes a product review.</p>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3>Add a product</h3>
          <form onSubmit={createProduct}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              <input className="input" placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
              <input className="input" type="number" placeholder="Price ₹" value={price} onChange={(e) => setPrice(e.target.value)} />
              <input className="input" type="number" placeholder="Inventory" value={inventory} onChange={(e) => setInventory(e.target.value)} />
            </div>
            {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
            <Button type="submit" loading={loading}>Add Product</Button>
          </form>
        </div>

        {!products ? (
          <p>Loading…</p>
        ) : products.length === 0 ? (
          <div className="card">No products yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {products.map((p) => (
              <div key={p.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="helper-text">{p.sku ?? "no SKU"} · Stock: {p.inventory}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {p.price && <div style={{ fontWeight: 600 }}>₹{p.price}</div>}
                  <Button variant="secondary" onClick={() => archive(p.id)}>Archive</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
