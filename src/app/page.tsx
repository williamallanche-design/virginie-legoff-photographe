// Page d'attente : sera remplacée par le hero scrollé en phase 2.
export default function Home() {
  return (
    <main data-mood="nuit" className="gutter grid min-h-dvh content-between bg-bg py-8 text-fg">
      <header className="meta flex flex-wrap justify-between gap-4 border-b border-line pb-5">
        <span>Virginie Legoff</span>
        <span>Photographe d&apos;art &amp; d&apos;événements</span>
      </header>

      <h1 className="text-display">
        Entre ciel <em className="text-accent">et mer</em>
      </h1>

      <p className="meta">Site en préparation</p>
    </main>
  );
}
