-- Term 테이블에 대한 UPDATE/DELETE 정책 추가
create policy "Allow update on Term"
  on public."Term" for update
  using (true)
  with check (true);

create policy "Allow delete on Term"
  on public."Term" for delete
  using (true);

-- Translation 테이블에 대한 UPDATE/DELETE 정책 추가
create policy "Allow update on Translation"
  on public."Translation" for update
  using (true)
  with check (true);

create policy "Allow delete on Translation"
  on public."Translation" for delete
  using (true);
