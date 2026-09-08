---
"@omega-flow/types": minor
"@omega-flow/engine": minor
"@omega-flow/editor": minor
"@omega-flow/store-aws": minor
---

Align all published package versions and cut a maintenance release.

- The four packages are now a `fixed` changesets group, so they version and
  publish together from here on.
- Refresh `pnpm` audit overrides: `fast-uri` `>=4.1.3`, `qs` `>=6.16.0`, and a
  new `browserslist` `>=4.28.7` pin, clearing the high-severity advisories that
  `pnpm audit --audit-level=high` reports against transitive dependencies.
- Roll in the batched production and dev dependency updates.
