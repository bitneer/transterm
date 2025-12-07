-- Drop permissive policies
drop policy "Allow anon insert on Term" on public."Term";
drop policy "Allow update on Term" on public."Term";
drop policy "Allow delete on Term" on public."Term";

drop policy "Allow anon insert on Translation" on public."Translation";
drop policy "Allow update on Translation" on public."Translation";
drop policy "Allow delete on Translation" on public."Translation";

-- Create restricted policies (Authenticated users only)
-- Term
create policy "Allow authenticated insert on Term"
  on public."Term" for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update on Term"
  on public."Term" for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete on Term"
  on public."Term" for delete
  to authenticated
  using (true);

-- Translation
create policy "Allow authenticated insert on Translation"
  on public."Translation" for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update on Translation"
  on public."Translation" for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete on Translation"
  on public."Translation" for delete
  to authenticated
  using (true);
