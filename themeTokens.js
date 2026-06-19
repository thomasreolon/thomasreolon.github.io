export function tokens(theme) {
  if (theme === 'dark') {
    return {
      bg: '#0e0c1a',
      heading: '#f4ebe2',
      titleHero: '#f6efe2',
      // Soft lift + moonlit atmospheric glow — quiet depth instead of heavy extrusion.
      titleHeroShadow: [
        '0 2px 0 rgba(22,18,44,0.85)',
        '0 18px 46px rgba(4,2,14,0.55)',
        '0 0 34px rgba(150,195,255,0.38)',
        '0 0 90px rgba(110,170,255,0.22)',
      ].join(', '),
      titleHeroFilter: 'none',
      body: '#d8cec4',
      muted: '#9a92a8',
      mono: '#b8aec4',
      accent: '#9fc2ff',
      accentInk: '#101226',
      cardBg: 'rgba(16,13,30,0.52)',
      cardBgMobile: 'rgba(16,13,30,0.82)',
      cardBorder: 'rgba(255,255,255,0.08)',
      cardBorderHover: 'rgba(255,255,255,0.22)',
      hairline: 'rgba(255,255,255,0.10)',
      headerSub: '#c0b4ae',
      heroSub: '#e8e0d4',
      heroSubShadow: '0 1px 14px rgba(4,2,14,0.6)',
      onScene: '#ece4f4',
      onSceneShadow: '0 1px 10px rgba(4,2,14,0.65)',
      scrim: 'rgba(8,6,18,0.46)',
      vignette: 'radial-gradient(ellipse at center, transparent 55%, rgba(2,1,8,0.32) 100%)',
      ringSelected: '#f4ebe2',
    };
  }

  return {
    bg: '#f4d8b8',
    heading: '#2a1a14',
    titleHero: '#27110a',
    // Single crisp ink edge + warm amber haze — editorial, not cartoonish.
    titleHeroShadow: [
      '0 2px 0 rgba(94,52,28,0.45)',
      '0 16px 38px rgba(74,28,8,0.30)',
      '0 0 34px rgba(255,176,96,0.42)',
      '0 0 90px rgba(255,150,70,0.20)',
    ].join(', '),
    titleHeroFilter: 'none',
    body: '#3c2418',
    muted: '#6b4f3e',
    mono: '#5a4438',
    accent: '#b8431f',
    accentInk: '#fff4e4',
    cardBg: 'rgba(255,249,240,0.62)',
    cardBgMobile: 'rgba(255,249,240,0.85)',
    cardBorder: 'rgba(80,40,20,0.10)',
    cardBorderHover: 'rgba(80,40,20,0.28)',
    hairline: 'rgba(80,40,20,0.12)',
    headerSub: '#3a261c',
    heroSub: '#2f180d',
    heroSubShadow: '0 1px 3px rgba(255,232,198,0.85), 0 2px 20px rgba(255,222,180,0.9), 0 0 42px rgba(255,210,160,0.6)',
    onScene: '#fff6ea',
    onSceneShadow: '0 1px 8px rgba(70,30,10,0.45)',
    scrim: 'rgba(58,32,18,0.30)',
    vignette: 'radial-gradient(ellipse at center, transparent 58%, rgba(58,22,8,0.20) 100%)',
    ringSelected: '#2a1a14',
  };
}
