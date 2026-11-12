import { z } from 'zod';

/**
 * Like `schema.partial()`, but WITHOUT filling in default values for fields the request didn't send.
 * (Zod 4 applies `.default()` even inside optional fields, so a plain `.partial()` would silently reset
 * things like `isActive` or `gender` whenever the admin edits just one field.)
 */
export function patchSchema<S extends z.ZodObject<any>>(schema: S): ReturnType<S['partial']> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, field] of Object.entries(schema.shape as Record<string, z.ZodTypeAny>)) {
    let inner: any = field;
    while (inner instanceof z.ZodDefault) inner = inner.unwrap();
    shape[key] = inner.optional();
  }
  return z.object(shape) as unknown as ReturnType<S['partial']>;
}
