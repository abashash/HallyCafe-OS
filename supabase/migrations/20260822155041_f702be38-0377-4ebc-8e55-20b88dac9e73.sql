
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.apply_invoice_item() from public, anon, authenticated;
revoke all on function public.apply_waste() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
