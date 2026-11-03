/** Response envelope shared by every API route and the browser clients that read them. */
export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}
