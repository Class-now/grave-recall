/**
 * t(key) helper - translates a key to the current locale's string.
 */
import type { TranslationKey } from './types';
import { en } from './en';
import { ja } from './ja';
import { locale } from '../store/prefs';

const translations: Record<'en' | 'ja', Record<TranslationKey, string>> = {
  en,
  ja,
};

/**
 * Gets the translation for a key in the current locale.
 * Falls back to English if key is missing.
 */
export function t(key: TranslationKey): string {
  const currentLocale = locale.value;
  const dict = translations[currentLocale];
  
  if (key in dict) {
    return dict[key as keyof typeof dict];
  }
  
  // Fallback to English
  if (key in translations.en) {
    console.warn(`Missing translation for key "${key}" in locale "${currentLocale}", falling back to English`);
    return translations.en[key as keyof typeof translations.en];
  }
  
  // Key not found at all
  console.error(`Translation key not found: ${key}`);
  return key;
}

/**
 * Interpolates variables into a translation string.
 * Usage: t('crypt.cardsCount', { count: 5 }) => "5 cards"
 */
export function ti(key: TranslationKey, vars: Record<string, string | number>): string {
  let result = t(key);
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(`{${k}}`, String(v));
  }
  return result;
}

// Export components for use in other modules
export { locale } from '../store/prefs';