/** Curated emoji icons for create-event (shown on voting cards). */
export const EVENT_ICONS = [
  '🍕', '☕', '🍔', '🍰', '🍳',
  '🏔️', '🥾', '🏕️', '🚶', '🌿',
  '📚', '✍️', '📜', '🧠',
  '🎮', '🎲', '♟️', '🎤',
  '🎬', '🎭', '🎶',
  '⚽', '🏸', '🏀', '💪', '🧘',
  '🎨', '📸', '🖌️',
  '🤝', '💬', '🌟', '🔥',
] as const;

export type EventIcon = (typeof EVENT_ICONS)[number];
