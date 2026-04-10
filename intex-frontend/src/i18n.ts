import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import pt from "./locales/pt.json";
import { getCookie, setCookie } from "./lib/cookies";

const LANG_COOKIE = "np_language";

const savedLanguage =
  typeof window !== "undefined"
    ? getCookie(LANG_COOKIE) ?? window.localStorage.getItem(LANG_COOKIE)
    : null;
const browserLanguage =
  typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
const initialLanguage =
  savedLanguage === "pt" || savedLanguage === "en"
    ? savedLanguage
    : browserLanguage.startsWith("pt")
      ? "pt"
      : "en";

function normalizeLanguage(language: string): "pt" | "en" {
  return language.toLowerCase().startsWith("pt") ? "pt" : "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  const normalized = normalizeLanguage(lng);
  if (typeof window !== "undefined") {
    setCookie(LANG_COOKIE, normalized);
    window.localStorage.setItem(LANG_COOKIE, normalized);
    document.documentElement.lang = normalized === "pt" ? "pt-BR" : "en";
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLanguage === "pt" ? "pt-BR" : "en";
}

export default i18n;
