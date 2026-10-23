# Security & Architecture Guidelines

- Public website content is stored separately from financial settings so anonymous visitors can never query internal business data.
- Branding images use the private `public-branding` bucket with public read policies and administrator-only writes because public buckets are disabled.
