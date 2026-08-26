import log from "./log";

export async function tryIntercom<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    log.warn(`Intercom ${operation} failed`, {
      "intercom.operation": operation,
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
