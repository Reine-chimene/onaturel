export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function badRequest(message: string): never {
  throw new ApiError(400, message);
}

export function unauthorized(message = "Authentification requise."): never {
  throw new ApiError(401, message);
}

export function forbidden(message = "Permission insuffisante."): never {
  throw new ApiError(403, message);
}

export function notFound(message: string): never {
  throw new ApiError(404, message);
}

export function conflict(message: string): never {
  throw new ApiError(409, message);
}
