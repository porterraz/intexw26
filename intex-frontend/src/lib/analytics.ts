import { getCookie } from "./cookies";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const CONSENT_KEY = "novapath_cookie_consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics() {
  const consent = getCookie(CONSENT_KEY) ?? localStorage.getItem(CONSENT_KEY);
  if (consent === "accepted") {
    loadGA();
  }
}

export function onConsentChange(value: "accepted" | "declined") {
  if (value === "accepted") {
    loadGA();
  } else {
    removeGA();
  }
}

function loadGA() {
  if (!GA_ID || document.getElementById("ga-script")) return;

  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
}

function removeGA() {
  const script = document.getElementById("ga-script");
  if (script) script.remove();

  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name.startsWith("_ga")) {
      document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/`;
    }
  });

  window.dataLayer = undefined;
  window.gtag = undefined;
}
