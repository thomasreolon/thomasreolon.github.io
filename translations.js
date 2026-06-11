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
      rail: {
        hero: 'Start',
        finance: 'Finance',
        ai: 'Machine Learning',
        realEstate: 'Real Estate',
        contact: 'Contact',
      },
      visit: 'Visit',
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
        project2: {
          title: 'Deepfake detection via facial action units',
          blurb: 'Person-specific deepfake detection trained on real footage only. OpenFace extracts 190 action-unit covariance features per video — muscle movement patterns a face-swap cannot fully replicate — which feed a One-Class SVM that learns what a real Obama or Musk looks like and flags deviations. Tested across six subjects: 89.6% accuracy, 94.5% F1.',
        },
        project3: {
          title: 'Optimal sampling from diffusion models',
          blurb: 'Generate N images from a prompt, score them with CLIP-IQA, keep the best — how large should N be? A systematic sweep finds the sweet spot sits around five: past that, returns diminish fast. The method lifts expected image quality by 15–20% at negligible extra cost.',
        },
      },
      realEstate: {
        project1: {
          title: 'Italian property investment tracker',
          blurb: 'Real estate listings across Italy, collected and scored by an AI valuation model. Each property is rated on investment potential — asking price weighed against local price trends, estimated rental yield, and comparable sales — so what surfaces first are the deals worth examining, not just the most recently posted listings.',
        },
      },
      contact: {
        kicker: 'Journey’s end',
        heading: 'Let’s build something.',
        sub: 'The runes on the altar hold my links — or take the short path:',
        links: [
          { label: 'LinkedIn', href: 'https://www.linkedin.com/in/thomas-reolon-9270971a3' },
          { label: 'GitHub', href: 'https://github.com/thomasreolon' },
          { label: 'CV & Docs', href: 'https://drive.google.com/drive/folders/1K-3m9gpXWkoQowV_7onFJv20afQ1rr78?usp=drive_link' },
        ],
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
      rail: {
        hero: 'Inizio',
        finance: 'Finanza',
        ai: 'Machine Learning',
        realEstate: 'Immobiliare',
        contact: 'Contatti',
      },
      visit: 'Apri',
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
        project2: {
          title: 'Rilevamento deepfake tramite action unit facciali',
          blurb: 'Rilevamento deepfake specifico per persona, addestrato solo su video reali. OpenFace estrae 190 feature di covarianza basate sulle action unit — pattern di movimento muscolare che uno swap facciale non riesce a replicare fedelmente — che alimentano una One-Class SVM che apprende come appare davvero un Obama o un Musk reale e segnala le deviazioni. Testato su sei soggetti: 89.6% di accuratezza, 94.5% di F1.',
        },
        project3: {
          title: 'Campionamento ottimale da modelli diffusivi',
          blurb: 'Genera N immagini da un prompt, valutale con CLIP-IQA, tieni la migliore — quanto grande deve essere N? Una scansione sistematica trova il punto ottimale intorno a cinque: oltre, i ritorni calano rapidamente. Il metodo migliora la qualità attesa delle immagini del 15–20% a costo marginale trascurabile.',
        },
      },
      realEstate: {
        project1: {
          title: 'Tracker immobiliare italiano',
          blurb: 'Annunci immobiliari italiani raccolti e valutati da un modello AI. Ogni proprietà riceve un punteggio di interesse come investimento — il prezzo richiesto confrontato con i trend locali, il rendimento da affitto stimato e le vendite comparabili — così in cima emergono le opportunità che vale davvero la pena guardare, non solo gli annunci più recenti.',
        },
      },
      contact: {
        kicker: 'Fine del viaggio',
        heading: 'Costruiamo qualcosa.',
        sub: 'Le rune sull’altare custodiscono i miei link — o prendi la via breve:',
        links: [
          { label: 'LinkedIn', href: 'https://www.linkedin.com/in/thomas-reolon-9270971a3' },
          { label: 'GitHub', href: 'https://github.com/thomasreolon' },
          { label: 'CV & Documenti', href: 'https://drive.google.com/drive/folders/1K-3m9gpXWkoQowV_7onFJv20afQ1rr78?usp=drive_link' },
        ],
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
