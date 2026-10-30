// WebMCP: the page exposes the same actions as the visible buttons to in-browser agents.
export type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => unknown;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

export function getModelContext() {
  return (document as Document & { modelContext?: ModelContext }).modelContext;
}
