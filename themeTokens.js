export function tokens(theme) {
  if (theme === 'dark') {
    return {
      bg: '#0e0c1a',
      heading: '#f4ebe2',
      titleHero: '#f0eae0',
      // Stacked extrusion shadow + electric-blue atmospheric glow.
      titleHeroShadow: [
        '1px 1px 0 #2c2640',
        '2px 2px 0 #221d34',
        '3px 3px 0 ' + '#181428',
        '4px 4px 0 #100c1c',
        '5px 6px 16px rgba(0,0,0,0.55)',
        '0 0 18px rgba(150,200,255,0.55)',
        '0 0 38px rgba(110,170,255,0.30)',
      ].join(', '),
      titleHeroFilter: 'drop-shadow(0 0 22px rgba(120,180,255,0.35))',
      body: '#d8cec4',
      muted: '#9a8e88',
      mono: '#b8aea4',
      cardBg: 'rgba(20,16,32,0.38)',
      cardBorder: 'rgba(255,255,255,0.08)',
      headerSub: '#c0b4ae',
      ringSelected: '#f4ebe2',
    };
  }

  return {
    bg: '#f4d8b8',
    heading: '#2a1a14',
    titleHero: '#1a0e08',
    // Stacked extrusion shadow in warm browns + amber atmospheric glow.
    titleHeroShadow: [
      '1px 1px 0 #5c3a26',
      '2px 2px 0 #7e5236',
      '3px 3px 0 #a06a44',
      '4px 4px 0 ' + '#bc8254',
      '5px 6px 14px rgba(50,20,10,0.40)',
      '0 0 24px rgba(255,170,90,0.40)',
    ].join(', '),
    titleHeroFilter: 'drop-shadow(0 0 18px rgba(255,170,90,0.30))',
    body: '#2a1a14',
    muted: '#5a4438',
    mono: '#5a4438',
    cardBg: 'rgba(255,250,242,0.52)',
    cardBorder: 'rgba(80,40,20,0.10)',
    headerSub: '#3a261c',
    ringSelected: '#2a1a14',
  };
}
