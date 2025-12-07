alter table public."Translation" add column sort_order integer default 0;

-- Update existing rows to have distinct sort_order based on id
with numbered as (
  select id, row_number() over (order by id) as rn
  from public."Translation"
)
update public."Translation" t
set sort_order = n.rn
from numbered n
where t.id = n.id;
