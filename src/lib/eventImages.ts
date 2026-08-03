import { supabase } from './supabase';

const BUCKET = 'event-images';

/** Upload a File/Blob to public event-images storage; returns public URL. */
export async function uploadEventImage(
  userId: string,
  file: Blob,
  ext = 'jpg',
): Promise<string> {
  const path = `${userId}/${Date.now()}.${ext.replace(/^\./, '')}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext}`,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadEventImageFromDataUrl(
  userId: string,
  dataUrl: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
  return uploadEventImage(userId, blob, ext);
}
