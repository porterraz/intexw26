import { useEffect, useRef, useState, useCallback, type MouseEvent } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import i18n from "../i18n";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicImpactSnapshot {
  activeSafehouses: number;
  residentsSupported: number;
  totalDonationsBRL: number;
}

type PillarIcon = "safehouse" | "visitation" | "process";

// ─── Mock API ────────────────────────────────────────────────────────────────

async function fetchImpactSnapshot(): Promise<PublicImpactSnapshot> {
  await new Promise((r) => setTimeout(r, 600));
  return { activeSafehouses: 34, residentsSupported: 412, totalDonationsBRL: 1_850_000 };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStatValue(value: number, index: number, locale: string): string {
  if (index === 2) {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(0) + "K";
  }
  return value.toLocaleString(locale);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AnimatedNumber({
  target,
  index,
  locale,
  prefix = "",
  suffix = "",
}: {
  target: number;
  index: number;
  locale: string;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref} aria-label={`${prefix}${target}${suffix}`}>
      {prefix}
      {formatStatValue(displayed, index, locale)}
      {suffix}
    </span>
  );
}

function TiltCard({
  pillar,
}: {
  pillar: { icon: PillarIcon; title: string; body: string; tag: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    setHovered(false);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      role="article"
      aria-label={pillar.title}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      className="relative rounded-2xl p-px cursor-default select-none h-full"
    >
      {/* glow border */}
      <motion.div
        aria-hidden="true"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(52,211,153,0.7), rgba(250,204,21,0.5), rgba(59,130,246,0.5))",
          filter: "blur(1px)",
        }}
      />
      {/* card body */}
      <div className="relative rounded-2xl bg-surface border border-brand-100 p-8 h-full flex flex-col gap-5 overflow-hidden">
        {/* subtle grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px), repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)",
          }}
        />
        <div className="flex items-start justify-between">
          <span
            className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-accent"
            aria-hidden="true"
          >
            {pillar.icon === "safehouse" ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 9.5L10 4l7 5.5V16H3V9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 16v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : pillar.icon === "visitation" ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 12.5h14M5.5 15.5h2a1 1 0 0 0 1-1v-2h3v2a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="6.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="13.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 9.5h8l-1-2H7l-1 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="5" y="3.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.5 7h5M7.5 10h5M7.5 13h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            {pillar.tag}
          </span>
        </div>
        <h3 className="font-bold text-xl text-surface-dark leading-snug">{pillar.title}</h3>
        <p className="text-sm text-surface-text leading-relaxed flex-1">{pillar.body}</p>
        <motion.div
          animate={{ x: hovered ? 4 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex items-center gap-2 text-accent text-sm font-medium mt-2"
          aria-hidden="true"
        >
          <span>Explore</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const { t, i18n: i18nInstance } = useTranslation();
  const [snapshot, setSnapshot] = useState<PublicImpactSnapshot | null>(null);
  const currentLanguage = i18nInstance.resolvedLanguage ?? "en";
  const nextLanguage = currentLanguage.toLowerCase().startsWith("pt") ? "en" : "pt";
  const languageToggleLabel = currentLanguage.toLowerCase().startsWith("pt")
    ? "Switch to English"
    : "Mudar para portugues";
  const numberLocale = currentLanguage.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";

  const content = {
    nav: t("nav"),
    hero: {
      eyebrow: t("hero_eyebrow"),
      headlineLine1: t("hero_title_line_1"),
      headlineLine2: t("hero_title_line_2"),
      sub: t("hero_subtitle"),
      cta: t("donate_button"),
      ctaSecondary: t("learn_more_button"),
    },
    impact: {
      heading: t("impact_heading"),
      stats: [
        { label: t("impact_safehouses"), suffix: "" },
        { label: t("impact_residents"), suffix: "+" },
        { label: t("impact_donations"), suffix: "", prefix: "$" },
      ],
    },
    pillars: [
      {
        icon: "safehouse",
        title: t("pillar_safehouse_title"),
        body: t("pillar_safehouse_body"),
        tag: t("pillar_safehouse_tag"),
      },
      {
        icon: "visitation",
        title: t("pillar_visitation_title"),
        body: t("pillar_visitation_body"),
        tag: t("pillar_visitation_tag"),
      },
      {
        icon: "process",
        title: t("pillar_process_title"),
        body: t("pillar_process_body"),
        tag: t("pillar_process_tag"),
      },
    ] as Array<{ icon: PillarIcon; title: string; body: string; tag: string }>,
    section: {
      navLogin: t("nav_login"),
      navImpact: t("nav_impact"),
      navPrivacy: t("nav_privacy"),
      whatWeDo: t("section_what_we_do"),
      threePillars: t("section_three_pillars"),
      oneMission: t("section_one_mission"),
      sectionSub: t("section_subtitle"),
      footer: t("footer_copyright"),
      systems: t("footer_systems"),
      scroll: t("scroll_hint"),
    },
  };

  useEffect(() => {
    fetchImpactSnapshot().then(setSnapshot);
  }, []);

  // Refs for scroll sections
  const impactRef = useRef<HTMLElement>(null);
  const pillarsRef = useRef<HTMLElement>(null);
  const impactInView = useInView(impactRef, { once: true, margin: "-100px" });
  const pillarsInView = useInView(pillarsRef, { once: true, margin: "-80px" });

  const statValues = snapshot
    ? [snapshot.activeSafehouses, snapshot.residentsSupported, snapshot.totalDonationsBRL]
    : [0, 0, 0];

  return (
    <div className="min-h-screen bg-brand-50 text-surface-dark overflow-x-hidden font-sans">
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Sora', sans-serif; }
        .noise-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* ════════════════════════════════ NAV ════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50 bg-brand-50/98 border-b border-brand-100 shadow-sm backdrop-blur-[1px]">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          {/* logo */}
          <motion.a
            href="#"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2.5 font-display font-bold text-lg tracking-tight text-surface-dark"
            aria-label="Nova Path — go to homepage"
          >
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#34d399,#facc15)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 7 7 13M1 7h12" stroke="#060e09" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {content.nav}
          </motion.a>

          <div className="flex items-center gap-2">
            <Link
              to="/impact"
              className="hidden sm:inline-flex items-center rounded-full border border-brand-100 px-3 py-1.5 text-xs font-medium text-surface-text hover:bg-brand-50 hover:text-surface-dark transition-colors"
            >
              {content.section.navImpact}
            </Link>
            <Link
              to="/privacy"
              className="hidden sm:inline-flex items-center rounded-full border border-brand-100 px-3 py-1.5 text-xs font-medium text-surface-text hover:bg-brand-50 hover:text-surface-dark transition-colors"
            >
              {content.section.navPrivacy}
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full border border-brand-100 px-3 py-1.5 text-xs font-medium text-surface-text hover:bg-brand-50 hover:text-surface-dark transition-colors"
            >
              {content.section.navLogin}
            </Link>
            <motion.button
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              type="button"
              onClick={() => void i18n.changeLanguage(nextLanguage)}
              className="inline-flex items-center gap-2 bg-surface hover:bg-brand-50 border border-brand-100 rounded-full px-4 py-1.5 text-sm font-medium text-surface-text transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              aria-label={languageToggleLabel}
              title={languageToggleLabel}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" />
                <path d="M1.8 7h10.4M7 1.5c1.6 1.5 1.6 9.5 0 11M7 1.5c-1.6 1.5-1.6 9.5 0 11" stroke="currentColor" strokeLinecap="round" />
              </svg>
              {languageToggleLabel}
            </motion.button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════ HERO ══════════════════════════════════ */}
      <section
        aria-label="Hero"
        className="relative noise-bg min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden"
      >
        {/* animated gradient orbs */}
        <motion.div
          aria-hidden="true"
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)" }}
        />
        <motion.div
          aria-hidden="true"
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.28, 0.15] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(250,204,21,0.14) 0%, transparent 70%)" }}
        />
        <motion.div
          aria-hidden="true"
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }}
        />

        {/* thin diagonal rule */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg,#34d399 0px,#34d399 1px,transparent 1px,transparent 80px)",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
          {/* eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-accent text-sm font-semibold uppercase tracking-[0.2em] flex items-center gap-3"
          >
            <span aria-hidden="true" className="w-8 h-px bg-emerald-400/60 inline-block" />
            {content.hero.eyebrow}
            <span aria-hidden="true" className="w-8 h-px bg-emerald-400/60 inline-block" />
          </motion.p>

          {/* headline — staggered word reveal */}
          <h1 className="font-display font-extrabold text-6xl sm:text-7xl md:text-8xl leading-[1.05] tracking-tight text-surface-dark" aria-label={`${content.hero.headlineLine1} ${content.hero.headlineLine2}`}>
            {[content.hero.headlineLine1, content.hero.headlineLine2].map((line, li) => (
              <span key={`${line}-${li}`} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: 0.35 + li * 0.18, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                >
                  {li === 0 ? (
                    line
                  ) : (
                    <>
                      <span
                        aria-hidden="true"
                        className="text-transparent bg-clip-text"
                        style={{
                          backgroundImage: "linear-gradient(90deg,#34d399,#facc15,#60a5fa)",
                        }}
                      >
                        {line}
                      </span>
                    </>
                  )}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="max-w-xl text-surface-text text-lg leading-relaxed"
          >
            {content.hero.sub}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            {/* donate button */}
            <motion.a
              href="#donate"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-brand-100 text-surface-text hover:text-surface-dark hover:border-brand text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label="Donate Now to Nova Path"
            >
              <span>{content.hero.cta}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.a>

            <motion.a
              href="#about"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-brand-100 text-surface-text hover:text-surface-dark hover:border-brand text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label={content.hero.ctaSecondary}
            >
              {content.hero.ctaSecondary}
            </motion.a>
          </motion.div>
        </div>

      </section>

      {/* ══════════════════════════════ IMPACT ════════════════════════════════ */}
      <section
        id="donate"
        ref={impactRef}
        aria-label="Impact Statistics"
        className="relative py-28 px-6 border-y border-brand-100 bg-surface"
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={impactInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-20"
          >
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-surface-dark">{content.impact.heading}</h2>
            <div aria-hidden="true" className="mt-4 mx-auto w-16 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
          </motion.div>

          <div
            role="list"
            className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4"
          >
            {content.impact.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                role="listitem"
                initial={{ opacity: 0, y: 32 }}
                animate={impactInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15 * i + 0.2, duration: 0.6 }}
                className="flex flex-col items-center gap-3 text-center group"
              >
                <div
                  aria-hidden="true"
                  className="w-12 h-px mb-2"
                  style={{ background: "linear-gradient(90deg,transparent,#34d399,transparent)" }}
                />
                <div className="font-display font-extrabold text-5xl sm:text-6xl tracking-tight text-accent tabular-nums">
                  {snapshot ? (
                    <AnimatedNumber
                      target={statValues[i]}
                      index={i}
                      locale={numberLocale}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                    />
                  ) : (
                    <span className="animate-pulse text-surface-text">—</span>
                  )}
                </div>
                <p className="text-surface-text text-sm font-medium uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════ PILLAR CARDS ════════════════════════════ */}
      <section
        id="about"
        ref={pillarsRef}
        aria-label="Core Pillars"
        className="py-28 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={pillarsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="mb-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          >
            <div>
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-[0.2em] mb-3">{content.section.whatWeDo}</p>
              <h2 className="font-display font-bold text-4xl sm:text-5xl text-white leading-tight">
                {content.section.threePillars},<br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(90deg,#34d399,#60a5fa)" }}
                >
                  {content.section.oneMission}
                </span>
              </h2>
            </div>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              {content.section.sectionSub}
            </p>
          </motion.div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            style={{ perspective: "1200px" }}
          >
            {content.pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 40 }}
                animate={pillarsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.12 * i + 0.15, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <TiltCard pillar={pillar} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FOOTER ════════════════════════════════ */}
      <footer className="border-t border-brand-100 py-10 px-6 bg-surface">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display font-bold text-sm text-surface-dark">{content.nav}</span>
          <p className="text-surface-text text-xs">{content.section.footer}</p>
          <div className="flex items-center gap-1 text-xs text-surface-text">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>{content.section.systems}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}