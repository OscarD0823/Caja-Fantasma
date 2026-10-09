/** Serialize native start/stop across quick toggles and React StrictMode remounts. */
export function createPhoneBridgeLifecycle() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      const result = tail.then(operation);
      tail = result.catch(() => undefined);
      return result;
    },
  };
}
