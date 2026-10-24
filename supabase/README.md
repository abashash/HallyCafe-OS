# Supabase administrator setup

New accounts receive the `staff` role by default. This prevents public account
registration from granting administrator access. After creating the intended
administrator account, a trusted project operator must grant its role through
the Supabase SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('admin@example.com')
ON CONFLICT (user_id, role) DO NOTHING;
```

Replace `admin@example.com` with the exact email address of the account to
promote. Verify that the account exists before running the query; if no row is
inserted, create that account first. Do not expose this operation through an
unauthenticated endpoint or grant end users direct write access to `user_roles`.
After signing in with that Supabase administrator account, create staff accounts
from the application settings. Built-in demo staff accounts are no longer
created, and any persisted account still using a published demo PIN is disabled.

Staff PIN/OTP sign-ins use short-lived signed server sessions. Set
`HALLY_STAFF_SESSION_SECRET` in the server environment to a randomly generated
secret of at least 32 characters before enabling staff sign-in. For example,
generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Do not use a `VITE_`-prefixed variable or expose this secret to the browser.
Staff PINs are stored as salted scrypt hashes; existing plaintext PINs are
upgraded automatically when the store is read. PIN sign-in is rate-limited to
five failed attempts per staff account in a 15-minute window.
OTP codes are only returned in development when the SMS gateway does not deliver
the message; production deployments must configure a working SMS provider.
