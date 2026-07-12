import Link from 'next/link';

const HERO_ART = '/art/floral-still-life.png?v=3';

const STEPS = [
  {
    index: '01',
    title: 'Drop a place',
    copy: 'Type a location or pin the map. Aruna locks coordinates and terrain.',
  },
  {
    index: '02',
    title: 'Read the light',
    copy: 'Golden hour, blue hour, and sun angle — computed for that exact pin.',
  },
  {
    index: '03',
    title: 'Shoot with intent',
    copy: 'Tag-matched photo inspiration and an AI briefing built for the frame.',
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-full bg-paper text-ink">
      {/* Hero — art via CSS bg so large PNG always paints (no next/image optimize stall) */}
      <section
        className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ink bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_ART})` }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--ink)_40%,transparent)_0%,color-mix(in_srgb,var(--ink)_55%,transparent)_100%)]"
          aria-hidden
        />

        <header className="relative z-20 flex items-center justify-between px-5 py-5 md:px-10">
          <p className="font-merisca text-lg tracking-wide text-paper md:text-xl">
            Aruna
          </p>
          <Link
            href="/dashboard"
            className="border border-paper/40 bg-transparent px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-paper transition-colors hover:border-accent hover:text-accent"
          >
            Open scout
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
          <p className="anim-rise text-[11px] font-medium uppercase tracking-[0.35em] text-paper/85">
            Maps for photographers
          </p>

          <h1
            className="font-merisca anim-rise mt-6 text-[clamp(4.5rem,18vw,11rem)] leading-[0.85] text-paper drop-shadow-[0_2px_24px_color-mix(in_srgb,var(--ink)_70%,transparent)]"
            style={{ animationDelay: '0.15s' }}
          >
            Aruna
          </h1>

          <p
            className="anim-rise mt-8 max-w-lg text-[11px] font-medium uppercase tracking-[0.28em] text-paper/90 sm:text-xs"
            style={{ animationDelay: '0.3s' }}
          >
            Pin the place. Read the light. Shoot the frame.
          </p>

          <div
            className="anim-rise mt-10 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: '0.45s' }}
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center border border-accent bg-accent px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Start scouting
            </Link>
            <a
              href="#method"
              className="inline-flex items-center justify-center border border-paper/50 bg-transparent px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-paper"
            >
              See the method
            </a>
          </div>
        </div>
      </section>

      <section id="method" className="border-b border-line px-5 py-16 md:px-10 md:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="label-caps text-accent">Method</p>
          <h2 className="font-merisca mt-3 text-4xl leading-[1.05] text-ink md:text-6xl">
            Three boxes. One clear shoot plan.
          </h2>
        </div>
        <div className="grid gap-0 border border-line md:grid-cols-3">
          {STEPS.map((step, index) => (
            <article
              key={step.index}
              className={`box-soft border-0 p-6 md:p-8 ${
                index > 0 ? 'border-t border-line md:border-t-0 md:border-l' : ''
              }`}
            >
              <p className="font-mono text-xs text-accent">{step.index}</p>
              <h3 className="font-modern mt-4 text-xl font-bold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {step.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 md:px-10 md:py-24">
        <div className="box grid overflow-hidden md:grid-cols-[1.15fr_0.85fr]">
          <div
            className="relative flex min-h-72 items-end border-b border-line bg-cover bg-center md:min-h-[28rem] md:border-b-0 md:border-r"
            style={{ backgroundImage: `url(${HERO_ART})` }}
            role="img"
            aria-label="Classical floral still life artwork"
          >
            <div className="absolute inset-0 bg-ink/20" aria-hidden />
            <p className="font-merisca relative z-10 p-8 text-4xl text-paper md:text-5xl">
              Aruna
            </p>
          </div>
          <div className="flex flex-col justify-between gap-8 p-8 md:p-12">
            <div>
              <p className="label-caps text-accent">Ready</p>
              <p className="font-merisca mt-4 text-3xl leading-tight text-ink md:text-5xl">
                Open the desk. Drop a pin. Leave with a briefing.
              </p>
            </div>
            <Link href="/dashboard" className="btn-primary w-fit">
              Enter dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-line px-5 py-6 md:px-10">
        <p className="font-merisca text-lg text-ink">Aruna</p>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          Maps for photographers
        </p>
      </footer>
    </div>
  );
}
