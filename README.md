# های ایونت (HiEvent)

نسخه فارسی و راست‌به‌چپ فرانت‌اند **HiEvent** برای کاربران فارسی‌زبان.

## راه‌اندازی

```bash
npm install
```

فایل `.env.local` را بسازید:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

```bash
npm run dev
```

## تفاوت‌ها

- `dir="rtl"` و `lang="fa"` در HTML
- فونت **Vazirmatn**
- متن‌های رابط کاربری به فارسی
- نام دسته‌بندی‌ها از طریق `src/locale/categoriesFa.ts` ترجمه می‌شوند (دیتابیس همچنان انگلیسی است)

## ساخت

```bash
npm run build
```
