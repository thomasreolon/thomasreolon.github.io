import { describe, expect, it } from 'vitest';
import { tokens } from '../themeTokens.js';

describe('theme tokens', () => {
  it('returns dark palette values', () => {
    const dark = tokens('dark');
    expect(dark.bg).toBe('#0e0c1a');
    expect(dark.heading).toBe('#f4ebe2');
    expect(dark.cardBorder).toBe('rgba(255,255,255,0.08)');
  });

  it('defaults to light palette values', () => {
    const light = tokens('light');
    expect(light.bg).toBe('#f4d8b8');
    expect(light.heading).toBe('#2a1a14');
    expect(light.cardBorder).toBe('rgba(80,40,20,0.10)');
  });
});
