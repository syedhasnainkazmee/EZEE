import type { Config } from 'drizzle-kit'

export default {
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:./design-review.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config