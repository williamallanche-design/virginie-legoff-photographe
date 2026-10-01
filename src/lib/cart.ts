"use client";

import { useSyncExternalStore } from "react";

export type CartItem = { photo: string; support: string; format: string; qty: number };

const KEY = "vl-panier";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw) ? raw.filter((i) => i && typeof i.photo === "string" && i.qty > 0) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // stockage indisponible (navigation privée stricte) : le panier vit le temps de la page
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);

const same = (a: CartItem, b: Omit<CartItem, "qty">) =>
  a.photo === b.photo && a.support === b.support && a.format === b.format;

export function addToCart(item: Omit<CartItem, "qty">, qty = 1) {
  const items = read();
  const existing = items.find((i) => same(i, item));
  write(
    existing
      ? items.map((i) => (same(i, item) ? { ...i, qty: Math.min(10, i.qty + qty) } : i))
      : [...items, { ...item, qty }],
  );
}

export function setQty(item: Omit<CartItem, "qty">, qty: number) {
  const items = read();
  write(qty <= 0 ? items.filter((i) => !same(i, item)) : items.map((i) => (same(i, item) ? { ...i, qty: Math.min(10, qty) } : i)));
}

export const clearCart = () => write([]);
export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
