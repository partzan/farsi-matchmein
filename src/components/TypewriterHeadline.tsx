import { useEffect, useState } from 'react';
import { fa } from '../locale/fa';

const SENTENCES = fa.typewriter;

const TYPE_MS = 45;
const DELETE_MS = 30;
const PAUSE_TYPED_MS = 2800;
const PAUSE_DELETED_MS = 400;

type Phase = 'typing' | 'deleting' | 'waiting';

export function TypewriterHeadline() {
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');

  const currentSentence = SENTENCES[sentenceIndex];

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (displayed.length < currentSentence.length) {
        timeout = setTimeout(() => {
          setDisplayed(currentSentence.slice(0, displayed.length + 1));
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
        timeout = setTimeout(() => setPhase('waiting'), PAUSE_DELETED_MS);
      }
    } else if (phase === 'waiting') {
      timeout = setTimeout(() => {
        setSentenceIndex((i) => (i + 1) % SENTENCES.length);
        setDisplayed('');
        setPhase('typing');
      }, 0);
    }

    return () => clearTimeout(timeout);
  }, [phase, displayed, currentSentence]);

  return (
    <div className="h-[10.5rem] sm:h-[9rem] md:h-[8rem] lg:h-[7.5rem] flex items-center justify-center mb-6 px-2">
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.4] flex flex-wrap items-center justify-center gap-0 text-center max-w-4xl">
        <span className="bg-gradient-to-l from-gray-900 via-primary to-accent-orange bg-clip-text text-transparent">
          {displayed}
        </span>
        <span className="typewriter-cursor inline-block w-[3px] h-[0.85em] bg-primary align-middle rounded-sm flex-shrink-0" aria-hidden="true" />
      </h1>
    </div>
  );
}
