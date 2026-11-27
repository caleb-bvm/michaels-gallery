/** Editable main-page content. Spanish is required; empty English falls back to Spanish. */

export interface Img {
  src: string;
  w: number;
  h: number;
}

export interface Bi {
  es: string;
  en: string;
}

export interface SiteContent {
  hero: { title: Bi; line: Bi; slides: { img: Img; caption: Bi }[] };
  work: { intro: Bi; pieces: { img: Img; title: Bi; meta: Bi }[] };
  about: { title: Bi; p1: Bi; p2: Bi; portrait: Img | null };
  contact: { heading: Bi; email: string; phone: string; instagram: string; location: string };
}

export const pick = (b: Bi | undefined, locale: string) => (locale === 'en' && b?.en?.trim() ? b.en : (b?.es ?? ''));

const s = (src: string, w: number, h: number): Img => ({ src: `/sample/${src}`, w, h });

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    title: { es: 'La luz, esperando ser encontrada.', en: 'Light, waiting to be found.' },
    line: {
      es: 'Retratos, bodas y paisajes desde El Salvador y hacia donde la luz nos lleve.',
      en: 'Portraits, weddings and landscapes from El Salvador and wherever the light goes next.',
    },
    slides: [
      { img: s('hero1.jpg', 1500, 1000), caption: { es: 'Volcán de Agua al atardecer, 2026', en: 'Volcán de Agua at dusk, 2026' } },
      { img: s('hero2.jpg', 1500, 1000), caption: { es: 'Monterrico, última luz, 2025', en: 'Monterrico, last light, 2025' } },
      { img: s('hero3.jpg', 1500, 1000), caption: { es: 'Niebla sobre Cobán, 2025', en: 'Fog above Cobán, 2025' } },
    ],
  },
  work: {
    intro: {
      es: 'Cinco series recientes, de retratos a paisajes.',
      en: 'Five recent series, from portraits to landscapes.',
    },
    pieces: [
      { img: s('w4.jpg', 1000, 666), title: { es: 'Amanecer sobre Atitlán', en: 'Morning over Atitlán' }, meta: { es: 'Paisaje, 2026', en: 'Landscape, 2026' } },
      { img: s('w1.jpg', 666, 866), title: { es: 'Lucía, a contraluz', en: 'Lucía, backlit' }, meta: { es: 'Retrato, 2026', en: 'Portrait, 2026' } },
      { img: s('w3.jpg', 666, 866), title: { es: 'Noches de Semana Santa', en: 'Semana Santa nights' }, meta: { es: 'Documental', en: 'Documentary' } },
      { img: s('w2.jpg', 1000, 666), title: { es: 'Arcos de Antigua', en: 'Arcos de Antigua' }, meta: { es: 'Arquitectura, 2025', en: 'Architecture, 2025' } },
      { img: s('w5.jpg', 666, 866), title: { es: 'Bosque nuboso', en: 'Cloud forest' }, meta: { es: 'Paisaje, 2025', en: 'Landscape, 2025' } },
    ],
  },
  about: {
    title: { es: 'Las fotografías siempre han sido magia para mí.', en: 'Photographs have always been magic to me.' },
    p1: {
      es: 'Soy Michael. Estudio ingeniería en la Universidad Don Bosco y tengo una cámara en las manos desde los tres años. De niño le tomaba fotos a todo lo que podía, y lo sigo haciendo.',
      en: "I'm Michael. I study engineering at Universidad Don Bosco, and I've had a camera in my hands since I was three. Back then I photographed everything I could, and I still do.",
    },
    p2: {
      es: 'Trabajo de forma eficiente y entrego rápido, sin sacrificar nunca la calidad. Para mí, la calidad importa tanto como el trabajo mismo. No entrego nada a medias, y en cada sesión busco superar la anterior.',
      en: "I work efficiently and deliver fast, and I never trade quality for speed. To me, quality matters as much as the job itself. I don't hand over anything half done, and every shoot is a chance to beat the last one.",
    },
    portrait: null,
  },
  contact: {
    heading: { es: '¿Tienes algo que valga la pena recordar?', en: 'Have something worth remembering?' },
    email: 'calebortiz288@gmail.com',
    phone: '+503 6828 5524',
    instagram: '@caleb.bvm',
    location: 'El Salvador',
  },
};
