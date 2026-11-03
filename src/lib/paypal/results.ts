/**
 * PayPal Agent Toolkit tools return their API responses as JSON strings. This
 * normalizes a tool result to a plain object so callers can read fields safely.
 */
export function parseToolResult(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}
