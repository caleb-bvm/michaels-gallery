import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getContent } from '@/lib/content';
import { pick } from '@/lib/content-types';
import { Hero } from '@/components/site/Hero';
import { Develop } from '@/components/site/Develop';
import { IconCamera } from '@/components/icons';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const c = await getContent();
  const p = (b: Parameters<typeof pick>[0]) => pick(b, locale);
  const phoneDigits = c.contact.phone.replace(/[^\d]/g, '');
  const ig = c.contact.instagram.replace(/^@/, '');

  return (
    <main className="view-in">
      <Hero
        label={t('heroLabel')}
        title={p(c.hero.title)}
        line={p(c.hero.line)}
        slides={c.hero.slides.map((s) => ({ src: s.img.src, caption: p(s.caption) }))}
      />

      <section className="sec gut" id="series">
        <div className="sechead">
          <h2>{t('workTitle')}</h2>
          {p(c.work.intro) && <p>{p(c.work.intro)}</p>}
        </div>
        <div className="spread">
          {c.work.pieces.map((w, i) => (
            <figure key={w.img.src + i} className={`piece p${(i % 7) + 1}`}>
              <Develop className="frame">
                <Image src={w.img.src} alt={p(w.title)} fill sizes="(max-width: 860px) 100vw, 60vw" quality={80} />
              </Develop>
              <figcaption>
                <b>{p(w.title)}</b>
                <span>{p(w.meta)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="about sec gut" id="about">
        <div className="in">
          {c.about.portrait ? (
            <figure className="me">
              <Image src={c.about.portrait.src} alt={t('portraitPlaceholder')} fill sizes="(max-width: 860px) 100vw, 40vw" />
            </figure>
          ) : (
            <figure className="me empty" aria-label={t('portraitPlaceholder')}>
              <figcaption>
                <IconCamera />
                Michael
              </figcaption>
            </figure>
          )}
          <div>
            <h2>{p(c.about.title)}</h2>
            <p>{p(c.about.p1)}</p>
            {p(c.about.p2) && <p>{p(c.about.p2)}</p>}
          </div>
        </div>
      </section>

      <footer className="sec gut foot" id="contact">
        <h2>{p(c.contact.heading)}</h2>
        <dl className="cinfo">
          <div>
            <dt>{t('email')}</dt>
            <dd>
              <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>
            </dd>
          </div>
          <div>
            <dt>{t('phone')}</dt>
            <dd>
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer">
                {c.contact.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt>Instagram</dt>
            <dd>
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">
                @{ig}
              </a>
            </dd>
          </div>
          <div>
            <dt>{t('basedIn')}</dt>
            <dd>{c.contact.location}</dd>
          </div>
          <div className="cbtn">
            <a className="pill solid" href={`mailto:${c.contact.email}`}>
              {t('contactCta')}
            </a>
          </div>
        </dl>
        <p className="small">{t('rights', { year: new Date().getFullYear() })}</p>
      </footer>
    </main>
  );
}
