-- Više stavki na jednoj fakturi stanaru (npr. održavanje + posebna stavka).
-- Format: [{"label": "Mesečno održavanje", "amount": 3000}, ...]
-- Bezbedno za ponovno pokretanje. Aplikacija radi i bez ove kolone
-- (stavke se tada upisuju u opis), ali ih posle ne može ponovo da razdvoji.
alter table public.invoices add column if not exists line_items jsonb;
notify pgrst, 'reload schema';
