export function i18n(lang) {
  const dict = {
    en: {
      nav: {
        projects: 'Projects',
        items: [
          { id: 'finance', label: 'Finance' },
          { id: 'ai', label: 'Machine Learning' },
          { id: 'real-estate', label: 'Real Estate' },
          { id: 'contact', label: 'Contact' },
        ],
      },
      hero: {
        eyebrow: 'AI · Software Development · Machine Learning',
        subtitle: 'Helping companies reach results with math and code.',
        scroll: 'Scroll to wander',
      },
      chapterPrefix: 'Ch.',
      chapters: {
        finance: 'Finance',
        ai: 'Machine Learning',
        realEstate: 'Real Estate',
      },
      finance: {
        project1: {
          title: 'Daily market journal',
          blurb: 'Markets react to macro prints, earnings calls and geopolitics faster than anyone can read everything. A one-page daily digest of the signals that actually moved things, with the key macro indicators alongside.',
        },
        project2: {
          title: 'Return prediction',
          blurb: "If today's price already contains tomorrow's, no model should work. Trained on thirty years of equities anyway: returns stay mostly unpredictable — but a few faint signals survive, and you can see how each feature tilts a single stock.",
        },
      },
      ai: {
        project1: {
          title: 'Object detection on binary motion frames',
          blurb: 'A YOLO-inspired detector built for binary motion frames rather than RGB. The interesting parts lived in the seams: quantizing the network to run at the edge, neural architecture search over the topology, and getting useful gradients through a non-differentiable preprocessor whose discrete parameters fed those binary frames into the net.',
        },
      },
      placeholder: {
        status: 'Work in progress',
        heading: 'Chapter under construction.',
        leftLabel: 'Drafting',
        rightLabel: '2026',
      },
      realEstate: {
        teaser: 'A chapter still being written — pipelines, valuation work, and the unglamorous transaction tooling that lives behind a closing. Check back.',
      },
      contact: {
        altarText: 'Contacts on the altar.',
        copyright: '© 2026 Thomas Reolon',
        credits: 'CREDITS',
        creditsBody: [
          'Rock by Danni Bittman [CC-BY] via Poly Pizza',
          'Torii Gate by Hattie Stroud [CC-BY] via Poly Pizza',
          'Statue by Zsky [CC-BY] via Poly Pizza',
        ],
      },
    },
    it: {
      nav: {
        projects: 'Progetti',
        items: [
          { id: 'finance', label: 'Finanza' },
          { id: 'ai', label: 'Machine Learning' },
          { id: 'real-estate', label: 'Immobiliare' },
          { id: 'contact', label: 'Contatti' },
        ],
      },
      hero: {
        eyebrow: 'IA · Sviluppo Software · Machine Learning',
        subtitle: 'Aiuto le aziende a ottenere risultati con matematica e codice.',
        scroll: 'Scorri per esplorare',
      },
      chapterPrefix: 'Cap.',
      chapters: {
        finance: 'Finanza',
        ai: 'Machine Learning',
        realEstate: 'Immobiliare',
      },
      finance: {
        project1: {
          title: 'Diario di mercato giornaliero',
          blurb: 'I mercati reagiscono a dati macro, earnings call e geopolitica più velocemente di quanto chiunque possa leggere tutto. Un riepilogo quotidiano di una pagina con i segnali che hanno davvero mosso i mercati, accanto ai principali indicatori macro.',
        },
        project2: {
          title: 'Previsione dei rendimenti',
          blurb: "Se il prezzo di oggi contiene già quello di domani, nessun modello dovrebbe funzionare. Allenato comunque su trent'anni di azioni: i rendimenti restano per lo più imprevedibili — ma alcuni segnali deboli sopravvivono, e si può vedere come ciascuna feature influenzi un singolo titolo.",
        },
      },
      ai: {
        project1: {
          title: 'Object detection su frame di movimento binari',
          blurb: 'Un detector ispirato a YOLO costruito per frame di movimento binari invece che RGB. Le parti interessanti vivevano nelle giunzioni: quantizzare la rete per farla girare su edge device, neural architecture search sulla topologia, e ottenere gradienti utili attraverso un preprocessore non differenziabile i cui parametri discreti alimentavano quei frame binari nella rete.',
        },
      },
      placeholder: {
        status: 'Lavori in corso',
        heading: 'Capitolo in costruzione.',
        leftLabel: 'In stesura',
        rightLabel: '2026',
      },
      realEstate: {
        teaser: 'Un capitolo ancora da scrivere — pipeline, lavoro di valutazione e i tool di transazione poco affascinanti che vivono dietro a un closing. Torna a controllare.',
      },
      contact: {
        altarText: 'I contatti sono sull’altare.',
        copyright: '© 2026 Thomas Reolon',
        credits: 'CREDITI',
        creditsBody: [
          'Rock di Danni Bittman [CC-BY] via Poly Pizza',
          'Torii Gate di Hattie Stroud [CC-BY] via Poly Pizza',
          'Statua di Zsky [CC-BY] via Poly Pizza',
        ],
      },
    },
  };
  return dict[lang] || dict.en;
}
