import type { AuthService } from '../modules/auth/Auth.service';
import type { Request, Response } from 'express';
import type { LatestFormat as LatestAuthTokenFormat } from '../webdata/auth_token';

export enum AuthProblemCode {
  NOT_SIGNED_IN,
  NOT_REQUIRED_ROLE,
  TOKENS_EXPIRED,
  CANNOT_AUTH_TOKEN,
}

export class AuthProblem {
  public code: AuthProblemCode;

  constructor(code: AuthProblemCode) {
    this.code = code;
  }

  public static not_signed_in(): AuthProblem {
    return new AuthProblem(AuthProblemCode.NOT_SIGNED_IN);
  }

  public static not_required_role(): AuthProblem {
    return new AuthProblem(AuthProblemCode.NOT_REQUIRED_ROLE);
  }

  public static tokens_expired(): AuthProblem {
    return new AuthProblem(AuthProblemCode.TOKENS_EXPIRED);
  }

  public static cannot_auth_token(): AuthProblem {
    return new AuthProblem(AuthProblemCode.CANNOT_AUTH_TOKEN);
  }
}

export async function execute_if_administrator<T>(
  auth: AuthService,
  req: Request,
  res: Response,
  fn: (auth_token?: LatestAuthTokenFormat) => Promise<T>,
  otherwise?: (auth_token?: LatestAuthTokenFormat) => Promise<T | AuthProblem>,
): Promise<T | AuthProblem> {
  const authTkn = await auth.getAuthToken(req);

  if (!(authTkn instanceof AuthProblem)) {
    if (authTkn.groups.administrator) {
      return await fn(authTkn);
    }
  }

  if (otherwise) {
    return await otherwise(
      authTkn instanceof AuthProblem ? undefined : authTkn,
    );
  }

  return AuthProblem.not_required_role();
}

export async function execute_if_authorized<T>(
  auth: AuthService,
  req: Request,
  res: Response,
  fn: (auth_token?: LatestAuthTokenFormat) => Promise<T>,
  authorizer: (
    auth_token?: LatestAuthTokenFormat,
  ) => Promise<boolean> | boolean,
) {
  const authTkn = await auth.getAuthToken(req);

  if (!(authTkn instanceof AuthProblem)) {
    if (authTkn.groups.administrator) {
      return await fn(authTkn);
    }
  }

  if (await authorizer(authTkn instanceof AuthProblem ? undefined : authTkn)) {
    return await fn(authTkn instanceof AuthProblem ? undefined : authTkn);
  }

  return AuthProblem.not_required_role();
}
