export class ConfigService {
  // biome-ignore lint/suspicious/noExplicitAny: config should have any
  constructor(private readonly record: Record<string, any>) {}

  // biome-ignore lint/suspicious/noExplicitAny: parsed config must get resolved at runtime.
  private getAnyValue(keys: string[]): any | undefined {
    // biome-ignore lint/suspicious/noExplicitAny: parsed config must get resolved at runtime.
    let cur: any | undefined = this.record;
    const keySize = keys.length;
    for (let idx = 0; idx < keySize; idx++) {
      if (Array.isArray(cur)) {
        if (idx < keySize - 1) {
          return;
        }
      }

      if (typeof cur === "object") {
        const key = keys[idx] as string;
        cur = cur[key];
      }
    }

    return cur;
  }

  get<T>(key: string): T {
    if (!key) {
      throw Error("empty key is not allowed");
    }

    return this.getAnyValue(key.split(".")) as T;
  }

  getSlice<T>(key: string): T[] {
    if (!key) {
      throw Error("empty key is not allowed");
    }

    return this.getAnyValue(key.split(".")) as T[];
  }
}
