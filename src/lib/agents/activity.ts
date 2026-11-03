import type { Tool } from 'ai';
import type { ToolCallRecord } from '@/db/schema';

export interface ActivityRecorder {
  readonly records: readonly ToolCallRecord[];
  record(entry: ToolCallRecord): void;
}

export function createActivityRecorder(): ActivityRecorder {
  const records: ToolCallRecord[] = [];
  return {
    get records(): readonly ToolCallRecord[] {
      return [...records];
    },
    record(entry: ToolCallRecord): void {
      records.push(entry);
    },
  };
}

/**
 * Wraps every tool's execute so each call is timed and recorded, without changing
 * the tool's schema or description. The recorder output becomes the agent run's
 * audit trail and feeds the on-screen activity panel.
 */
export function withActivity(
  tools: Readonly<Record<string, Tool>>,
  recorder: ActivityRecorder,
): Readonly<Record<string, Tool>> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, t]) => [name, wrapTool(name, t, recorder)]),
  );
}

function wrapTool(name: string, t: Tool, recorder: ActivityRecorder): Tool {
  const original = t.execute;
  if (!original) {
    return t;
  }
  return {
    ...t,
    execute: async (input: unknown, options): Promise<unknown> => {
      const started = Date.now();
      try {
        const output = await original(input, options);
        recorder.record({ tool: name, input, output, durationMs: Date.now() - started, ok: true });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        recorder.record({
          tool: name,
          input,
          output: { error: message },
          durationMs: Date.now() - started,
          ok: false,
        });
        return { error: message };
      }
    },
  } as Tool;
}
