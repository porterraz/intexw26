import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "novapath_cookie_consent";

type ConsentValue = "accepted" | "declined";

export default function CookieBanner({
  onConsent,
}: {
  onConsent?: (value: ConsentValue) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const id = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(id);
    }
  }, []);

  function handleChoice(value: ConsentValue) {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
    onConsent?.(value);
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            aria-hidden="true"
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--color-surface-dark) 6%, transparent), transparent 50%)",
            }}
          />

          <motion.div
            key="banner"
            role="dialog"
            aria-modal="false"
            aria-label="Cookie consent"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "110%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 32,
              mass: 0.9,
            }}
            className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 w-auto sm:w-full sm:max-w-2xl"
          >
            <div
              className="relative rounded-2xl overflow-hidden border border-brand-100 shadow-2xl bg-surface"
              style={{
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute top-0 inset-x-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--color-brand) 30%, var(--color-accent) 65%, transparent)",
                }}
              />

              <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div
                    aria-hidden="true"
                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg mt-0.5"
                    style={{
                      background:
                        "linear-gradient(135deg,color-mix(in srgb, var(--color-brand) 15%, transparent),color-mix(in srgb, var(--color-accent) 10%, transparent))",
                      border: "1px solid color-mix(in srgb, var(--color-brand) 20%, transparent)",
                    }}
                  >
                    🍪
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-surface-dark text-sm leading-snug mb-1">
                      We use cookies
                    </p>
                    <p className="text-surface-text text-xs leading-relaxed">
                      Nova Path uses essential and analytical cookies to improve
                      your experience. We never sell your data. Read our{" "}
                      <a
                        href="/privacy"
                        className="text-brand underline underline-offset-2 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
                      >
                        Privacy Policy
                      </a>{" "}
                      to learn more.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleChoice("declined")}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-text border border-brand-100 hover:border-brand hover:text-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    aria-label="Decline non-essential cookies"
                  >
                    Decline
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleChoice("accepted")}
                    className="relative px-5 py-2.5 rounded-xl text-sm font-semibold text-surface bg-brand hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-50"
                    aria-label="Accept all cookies"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl opacity-50"
                      style={{
                        background:
                          "linear-gradient(135deg,color-mix(in srgb, var(--color-surface) 15%, transparent),transparent)",
                      }}
                    />
                    <span className="relative">Accept</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
