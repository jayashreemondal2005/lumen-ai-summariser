-- Adds the output language and writing style chosen for each saved summary.
alter table public.summaries add column if not exists language text not null default 'en' check (char_length(language) <= 8);
alter table public.summaries add column if not exists style text not null default 'neutral' check (style in ('neutral', 'simple', 'executive'));
