import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Prisma 7 requires the connection URL in prisma.config.ts.
// For migrations we use DIRECT_URL (port 5432, session-mode pooler) which supports advisory locks.
// The schema.prisma file still has url/directUrl for backward compat with any tools that read it.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
