/**
 * Ambient Deno type declarations for Supabase Edge Functions.
 *
 * These declarations provide editor-level type safety when the
 * Deno VS Code extension is not installed. They cover only the
 * Deno APIs actually used by our Edge Functions.
 *
 * At deployment time, the real Deno runtime provides the full API.
 */

declare namespace Deno {
  /** Serve HTTP requests using the Deno built-in server. */
  function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;

  /** Access environment variables. */
  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };
}
