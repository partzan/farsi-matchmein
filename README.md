# مچ‌می‌این — نسخه فارسی (RTL)

نسخه جداگانه و راست‌به‌چپ فرانت‌اند MatchMeIn برای کاربران فارسی‌زبان.

## راه‌اندازی

```bash
npm install
```

فایل `.env.local` را از پروژه اصلی کپی کنید (همان Supabase):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

```bash
npm run dev
```

## تفاوت‌ها با نسخه انگلیسی

- `dir="rtl"` و `lang="fa"` در HTML
- فونت **Vazirmatn**
- تمام متن‌های رابط کاربری به فارسی
- نام دسته‌بندی‌ها از طریق `src/locale/categoriesFa.ts` ترجمه می‌شوند (دیتابیس همچنان انگلیسی است)
- پروژه مستقل — ریپوی و دیپلوی جدا

## ساخت

```bash
npm run build
```
