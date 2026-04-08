import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import pt from "./locales/pt.json";

const savedLanguage =
  typeof window !== "undefined" ? window.localStorage.getItem("np_language") : null;
const browserLanguage =
  typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
const initialLanguage =
  savedLanguage === "pt" || savedLanguage === "en"
    ? savedLanguage
    : browserLanguage.startsWith("pt")
      ? "pt"
      : "en";

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
  if (typeof window !== "undefined") {
    window.localStorage.setItem("np_language", lng.startsWith("pt") ? "pt" : "en");
  }
});

export default i18n;
