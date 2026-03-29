# Pull Request

## Summary

<!-- What was changed and why. One short paragraph. -->

## Related Issue

Closes #

## Changes

<!-- Key files/components changed. Be specific — helps reviewers navigate the diff. -->

-

## DB Migration

<!-- If a migration was created, list the file and describe the schema change.
     If it touches RLS or Postgres grants, note that db:migrate:superuser is required.
     If no migration: delete this section. -->

- Migration file: `packages/server/prisma/migrations/...`
- Schema change:
- Requires `db:migrate:superuser`: Yes / No

## Testing Evidence

<!-- What was tested and how. Paste test names, describe manual steps, or note CI results.
     Include both unit tests and Storybook stories where applicable. -->

- [ ] Unit tests pass (`npm run test:unit`)
- [ ] Build passes (`npm run build`)

## Documentation Updated

<!-- List any docs updated as part of this PR.
     Only required when the change affects architecture patterns or product behaviour.
     Key docs: PRODUCT.md, ARCHITECTURE.md, CONTRIBUTING.md, copilot-instructions/*.md -->

- No documentation changes required

## Checklist

- [ ] MUI only — no custom CSS or other component libraries
- [ ] All colours and typography via theme tokens
- [ ] Skeleton loading states for all async content
- [ ] Zod validation from `@spectatr/shared-types`
- [ ] No `any` types — strict TypeScript
- [ ] Sport-agnostic — no hardcoded sport/position/squad values
- [ ] Unit tests added/updated for new business logic
- [ ] Storybook stories added/updated for new real UI components
- [ ] No `console.log` statements left in
