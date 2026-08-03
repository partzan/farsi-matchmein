/** Casual Persian copy for known English event titles/pitches (voting & display). */
const BY_TITLE: Record<string, { title: string; pitch: string }> = {
  'Professional Lunch Networking': {
    title: 'ناهار و آشنایی با هم‌مسیرها',
    pitch:
      'یه ناهار راحت تو یه رستوران خوب رشت؛ حرف بزن، بخند، با جوونای هم‌مسیر آشنا شو.',
  },
  'Gilaki Breakfast Gathering': {
    title: 'صبحونه گیلکی دور هم',
    pitch:
      'صبح رو با صبحونه سنتی گیلکی تو یه کافه فضای‌باز شروع کن. حال خوب برای دیدن آدمای محلی.',
  },
  'Cozy Dinner & Conversations': {
    title: 'شام دنج و گپ خودمونی',
    pitch:
      'بعد از یه هفته شلوغ، شام بخور و گپ بزن تو یه رستوران آروم. جای خوب برای دوست جدید پیدا کردن.',
  },
  'Badminton 2 vs 2 Tournament': {
    title: 'بدمینتون دو به دو',
    pitch:
      'راکت‌ت رو بردار! یه بازی دوستانه بدمینتون میکس ۲ به ۲ تو سالن. از همه سطح‌ها خوش اومدید.',
  },
  'Mastering Baghali Ghatogh': {
    title: 'کلاس باقالی‌قاتق',
    pitch:
      'رازهای آشپزی گیلکی رو یاد بگیر؛ با سبزی تازه و سیر محلی تو یه آشپزخونه سنتی رشت باقالی‌قاتق درست می‌کنیم.',
  },
  "Lahijan Men's Local Futsal": {
    title: 'فوتسال آقایان لاهیجان',
    pitch:
      'دنبال یه فوتسال ۵ به ۵ دوستانه‌ای؟ بیا سالن سرپوشیده لاهیجان؛ هم رقابت، هم آشنایی.',
  },
  'Lahijan Tea Fields Hike': {
    title: 'پیاده‌روی باغ چای لاهیجان',
    pitch:
      'یه صبح قشنگ بین مزارع سبز چای لاهیجان، نزدیک شیطان‌کوه. مخصوص عاشقای طبیعت!',
  },
};

function looksLatin(text: string) {
  const letters = text.replace(/[^A-Za-z\u0600-\u06FF]/g, '');
  if (!letters) return false;
  const latin = (letters.match(/[A-Za-z]/g) || []).length;
  return latin / letters.length > 0.5;
}

export function eventTitleFa(title: string | null | undefined): string {
  if (!title) return '';
  return BY_TITLE[title]?.title ?? title;
}

export function eventBodyFa(
  title: string | null | undefined,
  description?: string | null,
  pitch?: string | null,
): string {
  const mapped = title ? BY_TITLE[title] : undefined;
  const raw = (description && description.trim()) || (pitch && pitch.trim()) || '';
  if (mapped && (!raw || looksLatin(raw))) return mapped.pitch;
  if (raw) return raw;
  return mapped?.pitch ?? '';
}
