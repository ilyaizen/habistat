import { init, register } from "svelte-i18n";
import { browser } from "$app/environment";

export const supportedLocales = ["en", "he", "es"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

// Map of locales to their properties
export const localeProperties = {
  en: { dir: "ltr", lang: "en" },
  he: { dir: "rtl", lang: "he" },
  es: { dir: "ltr", lang: "es" }
} as const;

function isValidLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

function getPreferredLocale(): SupportedLocale {
  if (!browser) return "en";

  const savedLocale = localStorage.getItem("locale");
  if (savedLocale && isValidLocale(savedLocale)) {
    return savedLocale;
  }

  const browserLang = browser ? window.navigator.language.split("-")[0] : "en";
  if (isValidLocale(browserLang)) {
    return browserLang;
  }

  return "en";
}

// Initialize i18n configuration
export function initializeI18n() {
  // Register locales
  register("en", () => import("./en.json"));
  register("he", () => import("./he.json"));
  register("es", () => import("./es.json"));

  const preferredLocale = getPreferredLocale();

  // Initialize i18n with the initial locale and required formats
  init({
    fallbackLocale: "en",
    initialLocale: preferredLocale,
    formats: {
      number: {
        EUR: { style: "currency", currency: "EUR" },
        USD: { style: "currency", currency: "USD" }
      },
      date: {
        short: { month: "numeric", day: "numeric", year: "2-digit" },
        long: { month: "long", day: "numeric", year: "numeric" }
      },
      time: {
        short: { hour: "numeric", minute: "numeric" },
        long: { hour: "numeric", minute: "numeric", second: "numeric" }
      }
    }
  });
}

// Initialize only in browser environment
if (browser) {
  try {
    initializeI18n();
  } catch (error) {
    console.error("i18n initialization failed:", error);
  }
}
