// Minimal run-id propagation helpers for Lovable AI Gateway calls.
const RUN_ID = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string | null) {
  let runId = initialRunId ?? null;
  const wrapped: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    const got = res.headers.get(RUN_ID);
    if (got) runId = got;
    return res;
  };
  return { fetch: wrapped, getRunId: () => runId };
}

export function withLovableAiGatewayRunIdHeader(
  res: Response,
  runIdFetch: { getRunId: () => string | null },
) {
  const id = runIdFetch.getRunId();
  if (id) res.headers.set(RUN_ID, id);
  return res;
}
