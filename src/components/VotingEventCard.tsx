import { useState } from 'react';
import { FlipCard } from './FlipCard';
import {
  BROAD_INTERESTS,
  broadInterestForCategoryName,
  type BroadInterest,
} from '../lib/broadInterests';
import { fa } from '../locale/fa';
import { categoryFa } from '../locale/categoriesFa';
import { eventBodyFa, eventTitleFa } from '../locale/eventCopyFa';

export type VotingEventItem = {
  id: string;
  title: string;
  pitch: string;
  description?: string | null;
  icon?: string | null;
  category?: { id: string; name: string } | null;
  gender_restriction?: string;
  event_votes?: [{ count: number }];
};

type VotingEventCardProps = {
  event: VotingEventItem;
  hasVoted: boolean;
  voteCount: number;
  animating?: boolean;
  unAnimating?: boolean;
  badgeRef?: (el: HTMLDivElement | null) => void;
  onVote: () => void;
  onUnvote: () => void;
};

function resolveBroad(categoryName?: string | null): BroadInterest {
  return (
    broadInterestForCategoryName(categoryName) ??
    BROAD_INTERESTS[BROAD_INTERESTS.length - 1]
  );
}

export function VotingEventCard({
  event,
  hasVoted,
  voteCount,
  animating,
  unAnimating,
  badgeRef,
  onVote,
  onUnvote,
}: VotingEventCardProps) {
  const [flipped, setFlipped] = useState(false);
  const broad = resolveBroad(event.category?.name);
  const displayIcon = event.icon?.trim() || broad.emoji;
  const categoryLabel = event.category?.name
    ? categoryFa(event.category.name)
    : broad.label;
  const title = eventTitleFa(event.title);
  const details = eventBodyFa(event.title, event.description, event.pitch);

  return (
    <div className="flex flex-col" dir="rtl">
      <FlipCard
        flipped={flipped}
        width="100%"
        height={280}
        className="w-full"
        onClick={() => setFlipped((f) => !f)}
        onMouseOver={() => setFlipped(true)}
        onMouseOut={() => setFlipped(false)}
        frontChild={
          <div
            className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${broad.gradient} p-5 text-center text-white shadow-sm`}
          >
            <div className="absolute inset-0 bg-black/10" aria-hidden />

            <div className="absolute top-3 start-3 z-10 flex flex-col gap-1.5">
              {event.gender_restriction === 'female_only' && (
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-pink-800">
                  👩 {fa.events.womenOnly}
                </span>
              )}
              {event.gender_restriction === 'male_only' && (
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-blue-800">
                  👨 {fa.events.menOnly}
                </span>
              )}
            </div>

            <div
              ref={badgeRef}
              className={`absolute bottom-3 end-3 z-10 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm transition-all duration-300 ${
                animating
                  ? 'scale-125 bg-primary text-white ring-4 ring-primary/40'
                  : unAnimating
                    ? 'scale-90 border border-red-200 bg-red-50 text-red-600 opacity-80'
                    : ''
              }`}
            >
              <span aria-hidden>⭐</span>
              {(fa.events.voteCountLabel ?? '{n} تا رأی').replace(
                '{n}',
                voteCount.toLocaleString('fa-IR'),
              )}
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3 px-2">
              <span
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 text-5xl shadow-inner backdrop-blur-sm ring-1 ring-white/30"
                aria-hidden
              >
                {displayIcon}
              </span>
              <p className="text-xs font-bold text-white/85">{broad.label}</p>
              <h3 className="line-clamp-2 text-lg font-black leading-snug">{title}</h3>
              <p className="text-[11px] font-medium text-white/70">{fa.events.flipHint}</p>
            </div>
          </div>
        }
        backChild={
          <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-white p-5 text-start shadow-sm">
            <p className="text-xs font-bold text-primary">
              {broad.emoji} {categoryLabel}
            </p>
            <h3 className="mt-2 text-base font-black leading-snug text-foreground">
              {title}
            </h3>
            <p className="mt-3 flex-1 overflow-y-auto text-sm leading-relaxed text-muted">
              {details || fa.events.noDescription}
            </p>
            <p className="mt-3 text-[11px] font-medium text-muted/80">{fa.events.flipBackHint}</p>
          </div>
        }
      />

      {hasVoted ? (
        <button
          type="button"
          onClick={onUnvote}
          className="mt-3 w-full rounded-xl border-2 border-border py-2.5 text-sm font-bold text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          {fa.events.removeVote}
        </button>
      ) : (
        <button
          type="button"
          onClick={onVote}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
        >
          {fa.events.vote}
        </button>
      )}
    </div>
  );
}
