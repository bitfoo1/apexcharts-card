import { describe, expect, it } from 'vitest';
import { getDefaultLocale, getLocales } from '../src/locales';

/**
 * These tests pin the contract that `apex-layouts.ts` relies on: it resolves a
 * locale as `locales[hass.language]`, so every key must be a language code
 * Home Assistant can actually report (ISO 639-1, optionally with a script or
 * region suffix). ApexCharts <= 5 shipped three locale files under non-ISO
 * names (rs/se/ua) which silently never matched.
 */
describe('getLocales', () => {
  const locales = getLocales();

  it('exposes only ISO-style language keys', () => {
    const isoLike = /^[a-z]{2}(-[a-z0-9]+)?$/;
    const offenders = Object.keys(locales).filter((key) => !isoLike.test(key));
    expect(offenders).toEqual([]);
  });

  it('does not reintroduce the non-ISO ApexCharts 5 keys', () => {
    expect(Object.keys(locales)).not.toContain('rs');
    expect(Object.keys(locales)).not.toContain('se');
    expect(Object.keys(locales)).not.toContain('ua');
  });

  it.each(['sr', 'sv', 'uk'])('resolves %s, which fell back to English before', (lang) => {
    expect(locales[lang]).toBeDefined();
  });

  it.each(['de', 'en', 'fr', 'bg', 'gl', 'ro'])('resolves %s', (lang) => {
    expect(locales[lang]).toBeDefined();
  });

  it('provides a usable ApexCharts locale payload for every key', () => {
    for (const [key, locale] of Object.entries(locales)) {
      const payload = locale as { name?: string; options?: { months?: string[]; shortMonths?: string[] } };
      expect(payload.options, `locale ${key} has no options`).toBeDefined();
      expect(payload.options?.months?.length, `locale ${key} has no months`).toBe(12);
      expect(payload.options?.shortMonths?.length, `locale ${key} has no shortMonths`).toBe(12);
    }
  });

  it('names every locale, because ApexCharts matches chart.defaultLocale against it', () => {
    for (const [key, locale] of Object.entries(locales)) {
      const payload = locale as { name?: string };
      expect(payload.name, `locale ${key} has no name`).toBeTruthy();
    }
  });
});

describe('getDefaultLocale', () => {
  it('falls back to English', () => {
    const payload = getDefaultLocale() as { name?: string };
    expect(payload.name).toBe('en');
  });
});
