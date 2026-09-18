drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = false) as
select
  p.id,
  p.first_name,
  date_part('year', age(p.date_of_birth))::int as age,
  p.gender,
  p.preferred_gender,
  p.min_age,
  p.max_age,
  p.city,
  p.bio,
  p.photo_url,
  p.extra_photos,
  p.interests,
  p.personality,
  p.is_demo,
  p.created_at
from public.profiles p
where p.is_complete
  and p.status = 'active'
  and not p.hidden
  and p.date_of_birth is not null
  and (p.id = auth.uid() or not public.is_blocked_pair(auth.uid(), p.id));

grant select on public.public_profiles to authenticated;
