import type { StandardSchemaV1 } from "@standard-schema/spec";

export class ConfigService {
  constructor(private readonly record: Record<string, unknown>) {}

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

  #getParsedResult<T>(
    key: string,
    schema: StandardSchemaV1<unknown, T>,
  ): StandardSchemaV1.Result<T> | Promise<StandardSchemaV1.Result<T>> {
    if (!key) {
      throw Error("empty key is not allowed");
    }

    const rawValue = this.getAnyValue(key.split("."));
    return schema["~standard"].validate(rawValue);
  }

  #throwIfFailed<T>(
    result: StandardSchemaV1.Result<T>,
  ): asserts result is StandardSchemaV1.SuccessResult<T> {
    if ("issues" in result) {
      throw new Error(
        `Validation failed: ${result.issues?.map((issue) => issue.message).join(", ")}`,
      );
    }
  }

  get<T>(key: string, schema: StandardSchemaV1<unknown, T>): T {
    const result = this.#getParsedResult(key, schema);
    if ("then" in result) {
      // this is promise
      throw new Error("use getAsync");
    }

    this.#throwIfFailed(result);
    return result.value;
  }

  async getAsync<T>(
    key: string,
    schema: StandardSchemaV1<unknown, T>,
  ): Promise<T> {
    const result = await this.#getParsedResult(key, schema);
    this.#throwIfFailed(result);
    return result.value;
  }

  getSlice<T>(key: string): T[] {
    if (!key) {
      throw Error("empty key is not allowed");
    }

    return this.getAnyValue(key.split(".")) as T[];
  }
}
