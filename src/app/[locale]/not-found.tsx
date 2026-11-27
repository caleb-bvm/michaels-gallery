import { Link } from '@/i18n/navigation';

export default function NotFound() {
  return (
    <main className="access">
      <div className="safe" />
      <div className="acc gut" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div>
          <h1>404</h1>
          <p className="lede">
            Esta página no existe. / This page doesn&apos;t exist.
          </p>
          <p style={{ marginTop: 24 }}>
            <Link className="pill" href="/">
              Michael&apos;s Gallery
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
