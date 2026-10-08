"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { clearCart } from "@/lib/cart";
import { euros } from "@/lib/catalog";

type Order = {
  status: "paid" | "processing" | "open" | "expired";
  firstName: string | null;
  amountTotal: number;
  shippingCost: number;
  items: { title: string; quantity: number; amountTotal: number }[];
  mode: "test" | "live";
};

type State = { kind: "loading" } | { kind: "order"; order: Order } | { kind: "error"; message: string };

/**
 * Retour de Stripe : l'état réel de la commande est lu sur le serveur.
 * Le panier n'est vidé que si le paiement est confirmé (ou en cours de traitement).
 */
export function OrderConfirmation() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id") ?? "";
    api<Order>(`order?session_id=${encodeURIComponent(id)}`)
      .then((order) => {
        if (order.status === "paid" || order.status === "processing") clearCart();
        setState({ kind: "order", order });
      })
      .catch((e) =>
        setState({ kind: "error", message: e instanceof ApiError ? e.message : "La commande n'a pas pu être vérifiée." }),
      );
  }, []);

  if (state.kind === "loading") return <p className="meta">Vérification du paiement…</p>;

  if (state.kind === "error") {
    return (
      <div className="grid gap-6">
        <h1 className="text-h1">
          Commande <em className="text-accent">introuvable</em>
        </h1>
        <p className="max-w-[56ch] text-muted">
          {state.message} Si vous venez de payer, vous recevrez un e-mail de confirmation ; sinon, votre panier vous attend.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/panier/" className="btn">Revenir au panier</Link>
          <Link href="/contact/" className="btn btn-ghost">Une question ?</Link>
        </div>
      </div>
    );
  }

  const { order } = state;
  const confirmed = order.status === "paid" || order.status === "processing";

  if (!confirmed) {
    return (
      <div className="grid gap-6">
        <h1 className="text-h1">
          Paiement <em className="text-accent">non finalisé</em>
        </h1>
        <p className="max-w-[56ch] text-muted">Aucun montant n&apos;a été débité. Votre panier est conservé.</p>
        <Link href="/panier/" className="btn w-fit">Reprendre la commande</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {order.mode === "test" && <p className="meta text-accent">Commande de test : aucun débit réel</p>}
      <h1 className="text-h1">
        Merci{order.firstName ? ` ${order.firstName}` : ""}, <em className="text-accent">votre commande est confirmée</em>
      </h1>
      <p className="max-w-[56ch] text-lead font-light text-muted">
        {order.status === "paid"
          ? "Le paiement est validé et un e-mail de confirmation vous a été envoyé. Virginie prépare votre tirage et vous écrira au moment de l'expédition."
          : "Votre paiement est en cours de traitement par votre banque. Vous recevrez un e-mail dès qu'il sera confirmé."}
      </p>
      <dl className="grid max-w-xl border-t border-line">
        {order.items.map((item, i) => (
          <div key={`${item.title}-${i}`} className="flex items-baseline justify-between gap-6 border-b border-line py-3">
            <dt>
              {item.quantity} × {item.title}
            </dt>
            <dd className="tabular-nums">{euros(item.amountTotal)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-6 border-b border-line py-3 text-muted">
          <dt>Livraison</dt>
          <dd className="tabular-nums">{order.shippingCost ? euros(order.shippingCost) : "offerte"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 py-4">
          <dt className="meta text-fg">Total payé</dt>
          <dd className="font-display text-[1.8rem] tabular-nums">{euros(order.amountTotal)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-4">
        <Link href="/galeries/" className="btn">Retour aux galeries</Link>
        <Link href="/contact/" className="btn btn-ghost">Une question ?</Link>
      </div>
    </div>
  );
}
