# Shared Types Package

This package contains shared TypeScript types, Zod schemas, and validation logic used across the Spectatr monorepo.

## Structure

- `schemas/` - Zod schemas for data validation
- `validation/` - Pure validation functions
- `config/` - Sport-specific configurations

## Usage

```typescript
import { validateSquad, type Player, type Squad } from '@spectatr/shared-types';
import { rugbySquadConfig } from '@spectatr/shared-types/config';

// Validate a squad
const squad = validateSquad(mySquadData);

// Use types
const player: Player = { ... };
```

## Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.
