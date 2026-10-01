import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <Section mood="papier" className="gutter min-h-dvh pb-24">
      <AdminApp />
    </Section>
  );
}
