"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type PaymentStatus = { enabled: boolean; mode: "test" | "live" | null };

/** État du paiement côté serveur : `null` tant qu'il n'est pas connu. */
export function usePaymentStatus() {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  useEffect(() => {
    let alive = true;
    api<PaymentStatus>("payment-status")
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatus({ enabled: false, mode: null }));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

/** Identifiant de tentative : sert de clé d'idempotence côté Stripe (double clic, requête rejouée). */
export const newAttemptId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
