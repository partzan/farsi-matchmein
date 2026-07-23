import { useEffect, useState } from 'react';
import { fa } from '../locale/fa';

const LINES = fa.typewriter;

const TYPE_MS = 45;
const DELETE_MS = 30;
const PAUSE_TYPED_MS = 7000;
const PAUSE_DELETED_MS = 400;

type Phase = 'typing' | 'deleting' | 'waiting';

export function TypewriterHeadline() {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [phase, setPhase] = useState<Phase>('typing');

  const current = LINES[lineIndex];

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (displayed.length < current.title.length) {
        timeout = setTimeout(() => {
          setDisplayed(current.title.slice(0, displayed.length + 1));
        }, TYPE_MS);
      } else {
        timeout = setTimeout(() => setPhase('deleting'), PAUSE_TYPED_MS);
      }
    } else if (phase === 'deleting') {
      if (displayed.length > 0) {
        timeout = setTimeout(() => {
          setDisplayed((text) => text.slice(0, -1));
        }, DELETE_MS);
      } else {
        setShowSubtitle(false);
        timeout = setTimeout(() => setPhase('waiting'), PAUSE_DELETED_MS);
      }
    } else if (phase === 'waiting') {
      timeout = setTimeout(() => {
        setLineIndex((i) => (i + 1) % LINES.length);
        setDisplayed('');
        setShowSubtitle(true);
        setPhase('typing');
      }, 0);
    }

    return () => clearTimeout(timeout);
  }, [phase, displayed, current.title]);

  return (
    <div className="h-[14.5rem] sm:h-[13.5rem] md:h-[14rem] lg:h-[15rem] w-full max-w-4xl mx-auto mb-8 px-2 flex flex-col items-center justify-center shrink-0">
      {/* Fixed 2-line title slot — sized for longest headline at each breakpoint */}
      <div className="h-[5.5rem] sm:h-[5.75rem] md:h-[6.5rem] lg:h-[8.25rem] w-full flex items-center justify-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.35] text-center w-full px-1">
          <span className="bg-gradient-to-l from-foreground via-accent-purple to-accent-orange bg-clip-text text-transparent">
            {displayed || '\u00A0'}
          </span>
          <span
            className="typewriter-cursor inline-block w-[3px] h-[0.85em] bg-accent-orange align-middle rounded-sm ms-0.5"
            aria-hidden="true"
          />
        </h1>
      </div>
      {/* Fixed 2-line subtitle slot */}
      <div className="h-[3.75rem] sm:h-[3.5rem] md:h-[3.5rem] w-full max-w-3xl flex items-center justify-center mt-4">
        <p
          className={`text-base sm:text-lg md:text-xl text-muted text-center leading-snug px-1 transition-opacity duration-200 ${
            showSubtitle ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {current.subtitle}
        </p>
      </div>
    </div>
  );
}
