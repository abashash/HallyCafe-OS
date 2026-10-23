# Public website, mobile menu, and admin settings

## Outcome

Create a configurable customer-facing café website while preserving the existing cost-control application. The public experience will use the supplied Hally-inspired visual language on mobile and desktop, without importing WordPress code or inventing café information.

## Build

1. **Public site settings and media**
   - Extend the existing singleton settings record with café name, logo, cover image, theme colors, homepage title/summary, about content, phone, address, hours, map/social links, and an ordered list of custom action buttons.
   - Keep all fields optional so empty information remains hidden.
   - Add a dedicated public branding bucket for logo and cover images; administrators can upload/replace images, while visitors can only read them.
   - Allow anonymous access only to the deliberately public settings record. Keep financial settings and every cost field out of public queries.

2. **Admin settings page**
   - Add «تنظیمات سایت» to the management navigation.
   - Provide grouped controls for identity, logo/cover, colors, homepage, about, contact details, and reorderable custom links.
   - Include image previews, color swatches, validation for links and colors, save feedback, and mobile-friendly form layout.
   - Use the configured café name and logo in the management shell where appropriate.

3. **Online menu parity**
   - Refine the current menu to use configurable branding and colors.
   - Preserve the reference structure on phones: compact top bar, persistent narrow category rail, one-column item feed, image on the right, readable description and orange price, without horizontal overflow.
   - Keep the desktop two-column cards, search, published-only categories/items, availability, featured/seasonal states, loading, empty, and useful error states.
   - Continue displaying customer prices in تومان while internal costing remains in ریال.

4. **Public pages**
   - Replace the root redirect with a real café homepage using an optional full-width cover, configured title, and configured action buttons.
   - Add separate `/about` and `/contact` pages with unique metadata and shared public navigation/footer.
   - Hide every unconfigured section rather than showing sample details; always keep a clear path to the online menu.

5. **Security hardening**
   - Bind audit-log creation to the signed-in user identity.
   - Restrict recipe and invoice line access to administrators, consistent with the established single-admin product scope.
   - Re-run the backend security scan and confirm anonymous users can read only published menu data, public site settings, and public branding files.

## Technical details

- Reuse the existing React/TanStack, TypeScript, Lovable Cloud, React Query, Tailwind, and shadcn architecture.
- Add schema changes through one backward-compatible migration; no existing rows or cost fields are removed or renamed.
- Centralize public settings loading and public-site tokens so home, menu, about, contact, and admin branding remain consistent.
- Keep all costing logic untouched and continue using the existing centralized cost engine.
- Add each linked page route in the same change and give every content route unique title, description, Open Graph title/description, type, and Twitter card metadata.

## Verification

- Test public pages signed out and the settings page signed in.
- Verify settings persistence, logo/cover upload, custom links, menu search/category selection, empty/error states, and no private-data requests.
- Check 390px mobile, tablet, and desktop layouts with screenshots and keyboard navigation.
- Run TypeScript checks, lint, build, targeted costing regression checks, dependency scan, and backend security scan.
