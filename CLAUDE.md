# Kapije Vračara — Resident Living Hub

Platforma za upravljanje stambenim zajednicama (Beograd). Tri uloge: **stanar** (`/`), **upravnik / admin** (`/admin`), **super-admin** (`/super-admin`). Ovaj fajl je kratak pregled stanja projekta, da nova sesija ne mora da čita ceo kod iznova. Ažuriraj ga kad završiš veću celinu.

## Rad sa korisnikom

- **Odgovaraj na srpskom, latinicom.** Kod, komande i nazivi fajlova ostaju kakvi jesu.
- Posle svake završene izmene koja prolazi proveru: **commit (poruka na srpskom) i push na `main`**, bez pitanja. Push na `main` automatski pušta deploy na Vercel.
- **Pre izmene produkcione baze, env promenljivih ili brisanja uvek pitaj.**
- Lozinke i tajne ključeve ne unosi u browser umesto korisnika. Ako treba prijava, korisnik se prijavljuje sam u browseru u aplikaciji.

## Stack

- Next.js 15 (App Router, server akcije), React 19, TypeScript, Tailwind (boje: `navy`, `cream`, `ink`, `gold`, `sage`, `brick`, `line`; klase `card`, `btn`, `tag`, `field-input`, `row-link` u `globals.css`)
- Supabase (Postgres + RLS, Auth, Storage, Realtime), `@supabase/ssr`
- `web-push` (VAPID), `qrcode` (IPS QR), `lucide-react`
- Testovi: Vitest (`npm test`), fajlovi `src/lib/*.test.ts`

## Okruženje i deploy

- Supabase projekat ref `jimysmlhybtzslkceqgg` (CLI je linkovan). Lokalni dev koristi **produkcionu bazu** (`.env.local`).
- Pravi sajt je Vercel projekat **`kapije-vracara-pocetna-verzija-gr49`** (tim „kapije“). Drugi projekat, `kapije-vracara-pocetna-verzija`, nije ova aplikacija: ponekad mu padne preview build i to se zanemaruje.
- Status deploy-a bez Vercel CLI-ja: `gh api repos/medjedovicf-gif/Kapije-Vracara---pocetna-verzija/commits/<sha>/status` (gleda se `-gr49`).
- Env promenljive su u `.env.local.example`. `NEXT_PUBLIC_*` promenljive na Vercelu moraju biti tipa Config, a ne Secret.
- Dev server (preview) radi na `localhost:3001`. **Ne pokreći `npm run build` dok on radi**, jer pregazi `.next` i server počne da vraća 500. Za proveru koristi `npx tsc --noEmit` i `npm run lint`, a ako je build ipak pokrenut, restartuj preview.

## Migracije baze (produkcija)

- SQL fajlovi su u `supabase/` i moraju biti bezbedni za ponovno pokretanje (`if not exists`, `drop policy if exists`). `schema.sql` je osnovna šema.
- Postupak: korisnik doda `.claude/settings.local.json` sa `{"permissions":{"allow":["Bash(supabase db query --remote *)"]}}`, izričito potvrdi **tu** migraciju, pa se pokreće **samostalna komanda** `supabase db query --remote --yes -f supabase/<fajl>.sql`. Spojena sa drugom komandom (`ls && …`), ne poklapa se sa pravilom i biva blokirana. Posle toga se proverava read-only upitom (`--read-only`), a korisnik briše pravilo sa `rm .claude/settings.local.json`.
- Read-only upiti (`supabase db query --remote --read-only "…"`) rade uvek.
- Funkcije u bazi koje koristi RLS: `my_role()`, `my_building_id()`, `my_unit()`.
- **Primenjeno na produkciji:** notifications, admin-command-center, user-experience, missing-schema, profile-privilege-guard, admin-finance, invoice-line-items, billing-ips, buildings-details.
- **Nije primenjeno:** `documents-reservations-migration.sql` (na grani `feature/dokumenti-rezervacije`).
- Kod koji zavisi od tabela koje još ne postoje ide na posebnu granu dok migracija ne prođe, ili mora sam da se snađe kad tabela fali (vidi `MissingMigration.tsx`).

## Konvencije u kodu

- **Datum i vreme svuda: `HH:MM DD.MM.YYYY`**, a samo datum `DD.MM.YYYY`, uvek po zoni Europe/Belgrade (`src/lib/format.ts`: `formatDateTime`, `formatDate`, `formatTime`). Ne koristi `toLocaleDateString`.
- Iznosi: `formatRsd` (`src/lib/finance.ts`). Nazivi meseci latinicom preko `periodLabel` (`src/lib/ips.ts`), jer ICU na serveru ume da vrati ćirilicu.
- Obaveštenja prave server akcije (`src/lib/notifications.ts`: `createNotifications`, `notifyStaffForBuilding`), ne triggeri u bazi.
- Važne akcije se upisuju u `audit_logs` (vidi se u Dnevniku aktivnosti).
- Server akcije proveravaju ulogu (`getMyProfile()` iz `src/lib/session.ts`), a RLS dodatno ograničava na zgradu. `createAdminClient()` (service role) koristi se samo na serveru, za obaveštenja i ažuriranje stanara.
- Limit tela server akcije je 4 MB (`next.config.js`). Fotografije se smanjuju u browseru (`compress-image.ts`).
- Zajedničke komponente:
  - `AdminModal` + `Field`: modal i polje forme
  - `DonutChart`: SVG grafikon bez biblioteke, boje `CHART_COLORS`
  - `FilterChips` + `makeHref`: filteri kao linkovi
  - KPI traka: `card !p-0 grid gap-px bg-line …` sa ćelijama `bg-white`

## Šta postoji (po delovima)

**Upravnik (`/admin`)**. Bočni meni (`components/admin/Sidebar.tsx`) ima grupe Finansije, Održavanje, Stanari i komunikacija i Zgrada.
- **Pregled:** traka sa 5 pokazatelja, 3 donut grafikona (troškovi po kategoriji, naplata, problemi po statusu), Potrebna akcija, Planirani radovi, Poslednje fakture i problemi.
- **Uplate i zaduženja** (`admin/payments`):
  - stanje po stanovima
  - faktura stanaru sa više stavki, pregledom i izmenom poslednje fakture (`SendInvoiceButton.tsx`, `actions/invoices.ts`, kolona `invoices.line_items`)
  - **mesečno zaduženje** za sve stanove jednim klikom (`BillingControls.tsx`, `actions/billing.ts`, `invoices.period` sa jedinstvenim indeksom po zgradi, stanu i periodu); dug stanara raste
  - **podešavanja uplate** (`building_billing_settings`)
  - ručno knjiženje uplate i bankovni izvod
- **IPS QR (NBS)**: `src/lib/ips.ts` (model 97, provera računa, IPS tekst), `PaymentBlock.tsx`, `IpsQrCode.tsx`. Poziv na broj je `kontrola + stan(4) + id fakture(6)`.
- **Fakture i troškovi** (`admin/expenses`): ulazne fakture dobavljača (`building_expenses`), učitavanje PDF-a ili slike u privatni bucket `expense-files`, plaćeno i neplaćeno, filteri.
- **Planirani radovi** (`admin/planned-works`, `planned_works`): procena troška i stvarni trošak iz vezanih faktura.
- **Finansijski izveštaj** (`admin/finance`): period, zaduženo, uplaćeno, troškovi, isplaćeno, neto, stanje računa od `buildings.opening_balance`. Tabele idu po mesecima, kategoriji, dobavljaču i stanu, uz spisak uplata i isplata. **Izvoz u CSV** preko `admin/finance/export?type=…`. Obračun je u `src/lib/finance-report.ts` i ima testove.
- **Zahtevi za servis, Inbox, Izveštaj održavanja, Stanari, Korisnički nalozi, Oglasna tabla, Ankete, Dnevnik aktivnosti.**
- **Podaci o zgradi** (`admin/buildings`): kartica sa svim podacima, a upravnik može da menja svoju zgradu.

**Super-admin (`/super-admin`)**
- **Pregled:** traka sa 6 pokazatelja, grafikoni (dug po zgradi, troškovi, zahtevi), tabela zgrada (upravnik, naplata, dug, zahtevi, popunjenost podataka).
- **Zgrade:** pun obrazac stambene zajednice (`components/BuildingForm.tsx`, `actions/buildings.ts`) sa poljima kod, adresa, opština, poštanski broj, tekući račun, email, godina izgradnje, lift, vrsta uprave, spratnost, grejanje, PIB, matični broj, početno stanje i komentar. Tekući račun se upisuje i u podešavanja uplate.
- **Uplate** i **Zahtevi:** pokazatelji, tabela po zgradama, filteri.
- **Stanari, Korisnici, Ankete, Oglasna tabla** su još u starom izgledu (`SuperAdminResourcePage.tsx`, `SuperAdminManagers.tsx`).

**Stanar (`/`)**: početna, Plaćanja (istorija sa stavkama, dugme **Plati** sa IPS QR-om), Servis (prijava kvara sa fotografijama, ocena), Oglasna tabla, Ankete, Mobilnost (GSP), Podešavanja (push obaveštenja). Ima PWA instalaciju i donji meni na telefonu.

## Otvoreno / čeka

1. **Grana `feature/dokumenti-rezervacije`** (dokumenti zgrade i rezervacije zajedničkih prostora) čeka `documents-reservations-migration.sql`. Posle migracije spojiti u `main`. Pazi na konflikt u `components/admin/Sidebar.tsx`, jer je meni u međuvremenu prepravljen u grupe.
2. **Uvoz bankovnog izvoda i automatsko povezivanje uplata** (`docs/finansije-plan.md`) čeka primer izvoda od korisnika (banka, format) i odgovore na otvorena pitanja. Poziv na broj (model 97) je već na svakoj fakturi.
3. **Supabase Auth:** Site URL i redirect `/auth/callback`, kao i SMTP za pozivnice i reset lozinke, nisu potvrđeni.
4. **Bezbednost:** rotacija starog Supabase secret ključa (procurio u `NEXT_PUBLIC_SUPABASE_ANON_KEY`) i opoziv starog GitHub tokena (bio u git remote URL-u). Korisnik treba da potvrdi da je oboje urađeno.
5. **VAPID ključevi** na Vercelu (Production) za push obaveštenja. Posle dodavanja treba redeploy.
6. Korisnik još nije uneo pravi tekući račun i podatke zgrada, i nije skenirao IPS QR pravom m-banking aplikacijom.
7. Super-admin stranice Stanari, Korisnici, Ankete i Oglasna tabla treba srediti u novom stilu.
8. Ideje koje su predložene, ali nisu rađene: finansije zgrade vidljive stanarima, automatske opomene za dug, podsetnici za obavezne preglede (lift, PP aparati, osiguranje), godišnji izveštaj za skupštinu (PDF).

## Provera pre push-a

```bash
npx tsc --noEmit
npm run lint
npm test
```

Vizuelna provera ide u browser panelu (`localhost:3001`). Ne pravi test podatke u produkciji bez potrebe, a ako ih napraviš, označi ih sa „TEST“ i obriši posle.
