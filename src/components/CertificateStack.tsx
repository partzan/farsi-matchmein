import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fa } from '../locale/fa';

export type CertItem = {
  id: string;
  title: string;
  hint: string;
};

const CERTS: CertItem[] = [
  { id: 'enamad', title: fa.footer.enamad, hint: fa.footer.enamadHint },
  { id: 'payment', title: fa.footer.paymentCert, hint: fa.footer.paymentCertHint },
  { id: 'license', title: fa.footer.businessLicense, hint: fa.footer.businessLicenseHint },
];

const STACK_STYLES = [
  'z-30 translate-y-0 scale-100 rotate-0',
  'z-20 translate-y-3 -translate-x-2 scale-[0.94] rotate-[-4deg]',
  'z-10 translate-y-6 translate-x-2 scale-[0.88] rotate-[5deg]',
];

/** Blank certificate face with title printed on it */
function CertFace({ title, hint, large }: { title: string; hint: string; large?: boolean }) {
  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#f7f4ef] via-white to-[#ebe6df] text-center shadow-inner ${
        large ? 'aspect-[4/3] min-h-[16rem] p-8' : 'aspect-[4/3] p-4'
      }`}
    >
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-dashed border-primary/20" />
      <div className="pointer-events-none absolute top-2 end-2 h-6 w-6 rounded-full border-2 border-primary/25" />
      <div className="pointer-events-none absolute bottom-2 start-2 h-5 w-5 rotate-12 border-2 border-accent-orange/30" />
      <p
        className={`relative font-black leading-snug text-foreground ${
          large ? 'text-2xl sm:text-3xl' : 'text-sm sm:text-base'
        }`}
      >
        {title}
      </p>
      <p className={`relative mt-1 text-muted ${large ? 'text-sm' : 'text-[10px]'}`}>{hint}</p>
    </div>
  );
}

export function CertificateStack({ compact }: { compact?: boolean }) {
  const [active, setActive] = useState(0);
  const [popup, setPopup] = useState<CertItem | null>(null);
  const wheelLock = useRef(false);
  const touchY = useRef<number | null>(null);

  const order = [0, 1, 2].map((i) => (active + i) % CERTS.length);

  const next = () => setActive((a) => (a + 1) % CERTS.length);
  const prev = () => setActive((a) => (a - 1 + CERTS.length) % CERTS.length);

  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopup(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popup]);

  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return;
    wheelLock.current = true;
    if (e.deltaY > 0) next();
    else prev();
    window.setTimeout(() => {
      wheelLock.current = false;
    }, 320);
  };

  return (
    <>
      <div
        className={`relative mx-auto select-none ${compact ? 'h-[7.5rem] w-[9.5rem]' : 'h-36 w-44'}`}
        onWheel={onWheel}
        onTouchStart={(e) => {
          touchY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchY.current == null) return;
          const dy = (e.changedTouches[0]?.clientY ?? touchY.current) - touchY.current;
          touchY.current = null;
          if (Math.abs(dy) < 28) return;
          if (dy > 0) prev();
          else next();
        }}
      >
        {order.map((certIndex, stackPos) => {
          const cert = CERTS[certIndex];
          return (
            <button
              key={cert.id}
              type="button"
              onClick={() => {
                if (stackPos === 0) setPopup(cert);
                else setActive(certIndex);
              }}
              className={`absolute inset-0 transition-all duration-300 ease-out ${STACK_STYLES[stackPos]} ${
                stackPos === 0 ? 'cursor-pointer' : 'cursor-pointer opacity-90'
              }`}
              aria-label={cert.title}
            >
              <CertFace title={cert.title} hint={cert.hint} />
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] font-bold text-muted">{fa.footer.certScrollHint}</p>

      {popup && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={popup.title}
          onClick={() => setPopup(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-border bg-white p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPopup(null)}
              className="absolute top-3 end-3 rounded-full border border-border bg-background p-1.5 text-foreground hover:bg-primary-light"
              aria-label={fa.footer.certClose}
            >
              <X className="h-4 w-4" />
            </button>
            <CertFace title={popup.title} hint={popup.hint} large />
          </div>
        </div>
      )}
    </>
  );
}

/** @deprecated use CertificateStack — kept for Contact page import path */
export function TrustBadges() {
  return <CertificateStack />;
}
