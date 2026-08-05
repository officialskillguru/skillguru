import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      reporter: ["text", "html"],
    },
    // supabase/functions/*/index.ts (the Deno entrypoints) are never named *.test.ts,
    // so they were never picked up as tests regardless of this exclude list; narrowed
    // so the new supabase/functions/_shared/*.test.ts unit tests (pure logic, no Deno
    // globals) added in Phase 2.3 actually run under `npm run test`.
    // .claude/worktrees/** holds full duplicate git worktree checkouts (own
    // node_modules included) that vitest would otherwise crawl and run as if
    // they were this checkout's own tests.
    exclude: ["node_modules", ".next", "dist", "tests/e2e/**", "src/app/**", ".claude/worktrees/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
