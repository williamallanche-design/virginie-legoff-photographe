"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";

/** Vide le panier une fois le retour de Stripe atteint (session de paiement présente dans l'URL). */
export function ClearCart() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("session_id")) clearCart();
  }, []);
  return null;
}
