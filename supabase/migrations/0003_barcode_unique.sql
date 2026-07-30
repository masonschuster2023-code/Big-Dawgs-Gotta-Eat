-- Lets barcode lookups be cached/deduped in the foods table, same pattern
-- as the fdc_id cache. Run this once in the Supabase SQL editor.

drop index if exists foods_user_barcode_idx;
create unique index if not exists foods_user_barcode_key on foods (user_id, barcode);
