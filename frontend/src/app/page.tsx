"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Item {
  id: number;
  name: string;
  description: string | null;
}

interface HealthData {
  status: string;
  version: string;
  environment: string;
  item_count: number;
  uptime_seconds: number;
}

type FormData = { name: string; description: string };

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", description: "" });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    const url = search
      ? `${API_URL}/items/?search=${encodeURIComponent(search)}`
      : `${API_URL}/items/`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [search]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setHealth(data);
      setHealthError(false);
    } catch {
      setHealthError(true);
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const resetForm = () => {
    setEditingItem(null);
    setForm({ name: "", description: "" });
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSubmitting(true);
    if (editingItem) {
      await fetch(`${API_URL}/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch(`${API_URL}/items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSubmitting(false);
    resetForm();
    await fetchItems();
    await fetchHealth();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
    await fetchItems();
    await fetchHealth();
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || "" });
  };

  const apiHealthy = !healthError && health !== null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              DevOps Demo App
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Items Manager · Cloud Run</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {health?.environment ?? "development"}
            </span>
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              healthError
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : apiHealthy
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                healthError ? "bg-red-500" : apiHealthy ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`} />
              API {healthError ? "Down" : apiHealthy ? "Healthy" : "Checking…"}
            </div>
          </div>
        </div>
      </header>

      {/* ── Stats strip ── */}
      {apiHealthy && (
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center gap-8">
            {(
              [
                { label: "Total Items", value: health!.item_count },
                { label: "Environment",  value: health!.environment },
                { label: "Version",      value: `v${health!.version}` },
                { label: "Uptime",       value: formatUptime(health!.uptime_seconds) },
              ] as const
            ).map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                  {label}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column body ── */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex gap-6 items-start">

        {/* Left — Add / Edit form */}
        <aside className="w-72 shrink-0 sticky top-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {editingItem ? `Editing Item #${editingItem.id}` : "Add New Item"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. Deploy pipeline"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional notes…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-sm border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {submitting ? "Saving…" : editingItem ? "Update Item" : "Add Item"}
              </button>
              {editingItem && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full text-sm text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                  Cancel edit
                </button>
              )}
            </form>
          </div>
        </aside>

        {/* Right — Search + list */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-zinc-700 rounded-lg pl-9 pr-10 py-2.5 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>

          {/* Items list */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
            {loading ? (
              <p className="px-6 py-16 text-center text-sm text-gray-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-gray-400 dark:text-zinc-500">
                {search
                  ? `No items match "${search}".`
                  : "No items yet — use the form on the left to add one."}
              </p>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-xs text-gray-400 dark:text-zinc-500">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                    {search && ` matching "${search}"`}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                        editingItem?.id === item.id
                          ? "bg-blue-50 dark:bg-blue-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <span className="text-xs font-mono text-gray-300 dark:text-zinc-600 w-8 shrink-0 text-right">
                        #{item.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium px-2.5 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-medium px-2.5 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <p className="text-xs text-gray-400 dark:text-zinc-600">
            API: {API_URL} · Deployed via GitHub Actions → Google Cloud Run
          </p>
        </div>
      </footer>

    </div>
  );
}
