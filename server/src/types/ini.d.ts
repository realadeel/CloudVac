declare module 'ini' {
  export function parse(str: string): Record<string, unknown>;
  export function stringify(obj: unknown, options?: unknown): string;
}
