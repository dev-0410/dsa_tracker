import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiErrorDetails = Record<string, unknown> | unknown[];

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetails;
  };
  requestId: string;
}

export interface ApiSuccessPayload<T> {
  data: T;
  requestId: string;
}

interface ResponseOptions {
  headers?: HeadersInit;
  requestId?: string;
  status?: number;
}

interface ErrorResponseOptions extends ResponseOptions {
  details?: ApiErrorDetails;
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: ApiErrorDetails;
  readonly headers?: HeadersInit;
  readonly status: number;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { cause?: unknown; details?: ApiErrorDetails; headers?: HeadersInit } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.headers = options.headers;
  }
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function requestIdFrom(request?: Pick<Request, 'headers'>): string {
  const supplied = request?.headers.get('x-request-id')?.trim();
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
}

function responseHeaders(requestId: string, supplied?: HeadersInit): Headers {
  const headers = new Headers(supplied);
  headers.set('cache-control', 'no-store');
  headers.set('x-request-id', requestId);
  return headers;
}

export function successResponse<T>(
  data: T,
  options: ResponseOptions = {},
): NextResponse<ApiSuccessPayload<T>> {
  const requestId = options.requestId ?? crypto.randomUUID();
  return NextResponse.json(
    { data, requestId },
    {
      status: options.status ?? 200,
      headers: responseHeaders(requestId, options.headers),
    },
  );
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  options: ErrorResponseOptions = {},
): NextResponse<ApiErrorPayload> {
  const requestId = options.requestId ?? crypto.randomUUID();
  const payload: ApiErrorPayload = {
    error: {
      code,
      message,
      ...(options.details === undefined ? {} : { details: options.details }),
    },
    requestId,
  };

  return NextResponse.json(payload, {
    status,
    headers: responseHeaders(requestId, options.headers),
  });
}

function prismaErrorResponse(
  error: Prisma.PrismaClientKnownRequestError,
  requestId: string,
): NextResponse<ApiErrorPayload> | null {
  if (error.code === 'P2002') {
    return errorResponse(409, 'CONFLICT', 'A record with those values already exists.', {
      requestId,
    });
  }

  if (error.code === 'P2025') {
    return errorResponse(404, 'NOT_FOUND', 'The requested resource was not found.', {
      requestId,
    });
  }

  if (error.code === 'P2003') {
    return errorResponse(409, 'RELATED_RESOURCE_CONFLICT', 'A related resource is invalid.', {
      requestId,
    });
  }

  return null;
}

/** Convert expected application errors into a stable, non-leaky JSON envelope. */
export function handleApiError(
  error: unknown,
  request?: Pick<Request, 'headers'>,
): NextResponse<ApiErrorPayload> {
  const requestId = requestIdFrom(request);

  if (error instanceof ApiError) {
    return errorResponse(error.status, error.code, error.message, {
      requestId,
      details: error.details,
      headers: error.headers,
    });
  }

  if (error instanceof ZodError) {
    return errorResponse(422, 'VALIDATION_ERROR', 'The request contains invalid values.', {
      requestId,
      details: error.flatten(),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const response = prismaErrorResponse(error, requestId);
    if (response) return response;
  }

  console.error('[api:error]', { requestId, error });
  return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.', { requestId });
}
