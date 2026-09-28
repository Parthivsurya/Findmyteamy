import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getCurrentUser, type SessionUser } from "./auth";

/** Shared helpers so every route handler answers with the same shapes. */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "You must be signed in") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "You do not have access to this") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function tooMany(message = "Too many requests, please slow down") {
  return NextResponse.json({ error: message }, { status: 429 });
}

export function serverError(message = "Something went wrong") {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Resolves the session user or throws an HttpError the wrapper turns into 401. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "You must be signed in");
  return user;
}

export async function requireAdminSession(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "ADMIN") throw new HttpError(403, "Admins only");
  return user;
}

/** Parse a JSON body against a Zod schema, reporting field errors on failure. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new HttpError(400, "Invalid input", flattenZod(result.error));
  }
  return result.data;
}

export function parseQuery<T>(url: string, schema: ZodType<T>): T {
  const params = new URL(url).searchParams;
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    raw[key] = all.length > 1 ? all : all[0]!;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, "Invalid query parameters", flattenZod(result.error));
  }
  return result.data;
}

export function flattenZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Wraps a handler so thrown HttpErrors (and unexpected errors) become clean
 * JSON responses instead of stack traces.
 */
export function route<A extends unknown[]>(
  handler: (request: Request, ...args: A) => Promise<Response>,
) {
  return async (request: Request, ...args: A): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status },
        );
      }
      if (error instanceof ZodError) {
        return badRequest("Invalid input", flattenZod(error));
      }
      console.error("[api]", error);
      return serverError();
    }
  };
}
