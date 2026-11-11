# Finansije: uvoz bankovnih izvoda i knjiženje

Plan za modul finansija. Radi se u fazama. Najvažnije je pouzdano povezati svaku uplatu sa pravim stanom, jer se sve ostalo zasniva na tome.

## Kako bi radilo

### 1. Učitavanje izvoda
- Admin preuzme izvod iz e-bankinga (CSV, XML ili TXT, zavisi od banke) i otpremi ga u aplikaciju.
- Aplikacija pročita izvod, prikaže pregled transakcija i upiše ih tek posle potvrde.
- Ako se isti izvod otpremi dvaput, ne nastaju duplikati. Svaka transakcija ima jedinstveni ID ili otisak (datum, iznos, referenca).

### 2. Automatsko knjiženje
- **Uplate stanara** se povezuju po **pozivu na broj**. Svaki stan ima jedinstven poziv na broj (npr. model 97 sa kontrolnim brojem), odštampan na uplatnici. Samo je ovaj način zaista pouzdan.
- Ako poziv na broj nedostaje ili je pogrešan, aplikacija pokuša da nađe stan po iznosu i imenu uplatioca i **predloži** ga. Admin potvrđuje jednim klikom.
- **Isplate (troškovi)** se kategorizuju pravilima, npr. "EPS" → Struja, "Lift d.o.o." → Održavanje lifta. Pravilo se napravi jednom i posle važi automatski.
- Sve što nije prepoznato ide u listu **"Za razvrstavanje"**. Tu admin ručno dodeli stan ili kategoriju.

### 3. Stanja
- **Saldo po stanu** = sva zaduženja (mesečne uplatnice) − sve uplate. Računa se iz knjiženja. Danas se ručno upisuje u `profiles.balance`, a ovako se uvek vidi odakle iznos dolazi.
- **Stanje računa zgrade** = početno stanje + prilivi − odlivi. Aplikacija ga poredi sa krajnjim stanjem na izvodu i upozori ako se ne slaže.

### 4. Prikazi
- **Admin → Finansije:** stanje računa, ko je platio a ko duguje, troškovi po kategorijama i mesecima, lista "Za razvrstavanje".
- **Stanar:** istorija sopstvenih uplata i trenutni saldo.
- **Superadmin:** pregled svih zgrada.

## Tehnički

Danas postoje samo `invoices` (uplatnice) i `profiles.balance` (ručno stanje). Nove tabele:

| Tabela | Namena |
|---|---|
| `bank_statements` | otpremljeni izvodi |
| `bank_transactions` | stavke sa izvoda, sa statusom povezivanja |
| `ledger_entries` | knjiženja (zaduženje, uplata, trošak) po stanu i zgradi |
| `expense_categories` | kategorije troškova |
| `matching_rules` | pravila za automatsko razvrstavanje |

Obavezna su RLS pravila: stanar vidi samo svoja knjiženja, admin samo svoju zgradu. Bankovni podaci su osetljivi.

**Automatsko preuzimanje izvoda iz banke** (bez otpremanja fajla) zavisi od banke. Većina banaka u Srbiji ne nudi otvoren API malim korisnicima. Zato počinjemo sa otpremanjem fajla, a API se dodaje kasnije ako ga banka podržava.

## Otvorena pitanja (čeka se odgovor)

1. **Banka:** koja banka, ili koje banke ako zgrade imaju račune na više mesta?
2. **Primer izvoda** u formatu koji e-banking nudi (CSV, XML ili TXT, ne PDF). Lični podaci mogu da se zamene izmišljenim, ali struktura i kolone moraju ostati iste. Bez primera ne može tačno da se napravi čitač.
3. **Poziv na broj:** da li stanovi već imaju jedinstven poziv na broj na uplatnicama? Ako nemaju, pravi se generisanje.
4. **Obračun zaduženja:** fiksan iznos po stanu, po kvadratu ili nešto drugo?
5. **Početna stanja:** stanje računa zgrade i dugovanja po stanovima na dan od kog se kreće.

Za početak faze 1 potrebni su primer izvoda i odgovori na pitanja 1, 3 i 4.

## Redosled faza

1. Tabele, poziv na broj po stanu, otpremanje izvoda sa pregledom.
2. Automatsko povezivanje uplata i lista "Za razvrstavanje".
3. Troškovi sa kategorijama i pravilima.
4. Saldo po stanu, stanje računa, provera sa izvodom, ekrani za admina i stanara.
