do $$
begin
  alter type public.account_status add value if not exists 'pending';
  alter type public.account_status add value if not exists 'approved';
  alter type public.account_status add value if not exists 'rejected';
exception
  when undefined_object then null;
end $$;
