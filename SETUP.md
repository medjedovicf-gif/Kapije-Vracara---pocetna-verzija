# Kapije Vračara — lokalno pokretanje i prvi deploy

Ovo je Next.js aplikacija za stanare, administratore i super-administratore. Podaci, autentifikacija, RLS i Storage koriste Supabase, a aplikacija se deployuje na Vercel.

## Preduslovi

- Node.js 20+
- Supabase projekat
- GitHub nalog
- Vercel nalog

---

## 1. Postavi bazu podataka (Supabase)

1. Otvori projekat na [supabase.com](https://supabase.com/dashboard).
2. U **SQL Editor → New query** pokreni fajlove ovim redom:
   - `supabase/schema.sql`
   - `supabase/notifications-migration.sql`
   - `supabase/admin-command-center-migration.sql`
   - `supabase/user-experience-migration.sql`

Migracije dodaju komentare, audit log, prioritete, zakazivanje, ocene i podešavanja notifikacija. `schema.sql` kreira i `ticket-photos` Storage bucket i RLS pravila.

## 2. Napravi tri test naloga (Filip, Budimir, Petar)

Supabase Auth radi sa **email-om**, ne korisničkim imenom, pa nalozima daj email adrese (mogu biti izmišljene za test, npr. `filip@kapijevracara.rs`).

1. Idi na **Authentication → Users → Add user → Create new user** i uključi **Auto Confirm User**.
2. Napravi tri naloga (uključi **Auto Confirm User** da ne moraš da potvrđuješ email):
   - `filip@kapijevracara.rs` — resident
   - `budimir@kapijevracara.rs` — admin
   - `petar@kapijevracara.rs` — superadmin
3. Za svaki nalog, kopiraj njegov **User UID** (vidiš ga u listi korisnika).
4. Idi na **SQL Editor** i pokreni (zameni `UID_...` sa pravim ID-jevima koje si kopirao, i `BUILDING_ID` sa ID-jem zgrade koji dobijaš iz `select id, name from buildings;`):

```sql
-- prvo pogledaj koje zgrade već postoje (schema.sql ih ne pravi automatski, dodaj ih ovde)
insert into buildings (name) values ('Zgrada A'), ('Zgrada B');
select id, name from buildings;

-- zameni BUILDING_B sa pravim id-jem "Zgrada B" iz gornjeg select-a
insert into profiles (id, name, role, unit, building_id, balance, payment_status) values
  ('UID_FILIPA', 'Filip Nikolić', 'resident', '12B', 'BUILDING_B', 497000, 'Na čekanju');

insert into profiles (id, name, role, building_id) values
  ('UID_BUDIMIRA', 'Budimir Vasić', 'admin', 'BUILDING_B');

insert into profiles (id, name, role) values
  ('UID_PETRA', 'Petar Petrović', 'superadmin');
```

Ako korisnici ili zgrade već postoje, nemoj ponovo izvršavati iste `insert` upite bez provere.

## 3. Fotografije kvarova (Storage)

`schema.sql` je već napravio `ticket-photos` bucket. Slike se čuvaju u Supabase Storage-u.

## 4. Pokreni projekat lokalno

U terminalu, u folderu projekta:

```bash
npm install
cp .env.local.example .env.local
```

Otvori `.env.local` i popuni vrednosti sa **Settings → API** stranice Supabase projekta:
- `NEXT_PUBLIC_SUPABASE_URL` — "Project URL"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — "anon public" ključ
- `SUPABASE_SERVICE_ROLE_KEY` — "service_role" ključ (⚠️ server-only, nikad ga ne commit-uj u git)

Opciono za dodatne funkcije:
- `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — browser push notifikacije
- `TRANSITLAND_API_KEY` — proxy za podatke o prevozu

Zatim:

```bash
npm run dev
```

Pre deploy-a pokreni i provere:

```bash
npm run lint
npm run build
```

`npm run build` zahteva mrežu jer `next/font/google` preuzima Fraunces, Inter i IBM Plex Mono tokom builda.

Otvori `http://localhost:3000` — trebalo bi da vidiš login ekran. Uloguj se sa jednim od tri naloga iz koraka 2.

## 5. Postavi na internet (Vercel)

1. Ako projekat još nije Git repozitorijum, napravi novi repo na GitHub-u i push-uj kod:
   ```bash
   git init
   git add .
   git commit -m "Kapije Vracara - pocetna verzija"
   git branch -M main
   git remote add origin https://github.com/TVOJ-NALOG/kapije-vracara.git
   git push -u origin main
   ```
2. Na [vercel.com](https://vercel.com) klikni **Add New → Project**, izaberi taj repozitorijum.
3. U **Environment Variables** unesi sve potrebne ključeve iz `.env.local` za `Production`, a po potrebi i `Preview`.
4. Klikni **Deploy**. Za par minuta dobijaš pravi URL (npr. `kapije-vracara.vercel.app`) koji radi sa bilo kog uređaja, sa pravim HTTPS-om.
5. Svaki sledeći `git push` na `main` granu automatski osvežava sajt uživo.

## Posle prvog deploy-a

Testiraj sa sva tri naloga: login i role, prijavu sa slikom, komentare, status i ocenu, oglasnu tablu, ankete, plaćanja i zabranu pristupa tuđim sekcijama. Ako su podešeni, proveri i browser push i Mobilnost.

## Sigurnost

- Lozinke se nikad ne čuvaju u kodu — Supabase ih hešira i čuva u svojoj auth bazi.
- Ko šta vidi/menja odlučuje se u **bazi** (Row Level Security), ne u JavaScript-u — čak i neko ko otvori DevTools ne može da zaobiđe pravila.
- Fotografije idu u pravi storage, ne kao base64 tekst.
- Obaveštenja i pristup podacima kontrolišu se kroz Supabase funkcije i RLS.
- `.env.local` i druge lokalne env fajlove ignoriše `.gitignore`.
