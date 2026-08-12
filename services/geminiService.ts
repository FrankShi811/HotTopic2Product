/**
 * Gemini is intentionally not available to browser code. The client talks only
 * to /api/generation-jobs; the server owns credentials, validation and retry
 * policy. This module remains as a migration marker for old imports.
 */
export function clientSideGeminiRemoved(): never {
  throw new Error('Gemini calls must be made through the server API.');
}
