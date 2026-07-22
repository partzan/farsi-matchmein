const DEFAULT_AVATARS = [
  '/images/avatars/manga_male_1.png',
  '/images/avatars/manga_male_2.png',
  '/images/avatars/manga_female_1.png',
  '/images/avatars/manga_female_2.png',
  '/images/avatars/manga_cat_1.png',
  '/images/avatars/manga_cat_2.png',
];

export function getAvatarUrl(avatarUrl: string | null | undefined, userId: string | null | undefined): string {
  if (avatarUrl) {
    return avatarUrl;
  }
  
  if (!userId) {
    return DEFAULT_AVATARS[0];
  }

  // Simple string hash to consistently pick the same avatar for a given userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}
