import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthService } from './Auth.service';
import { E2E } from '@/src/config';
import { AuthProblem } from '@/src/utils/auth_utils';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (E2E) return true;

    const httpContext = context.switchToHttp();
    const request: Request = httpContext.getRequest();

    const authtoken = await this.authService.getAuthToken(request);
    if (!(authtoken instanceof AuthProblem)) {
      return true;
    } else {
      const refresh_token = request.cookies['TAUTHR'] as string;
      if (refresh_token) {
        return false;
      } else {
        Logger.error(`User not signed in! [GUARD]`);

        return false;
      }
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let auth_successful = false;

    if (E2E) {
      next();
      return; // shouldn't be needed? whatever idk
    }

    const authtoken = await this.authService.getAuthToken(req);

    if (!(authtoken instanceof AuthProblem)) {
      auth_successful = true;
    }

    if (!auth_successful) {
      const refresh_token = req.cookies['TAUTHR'] as string;
      if (refresh_token) {
        return res.status(403).send('refresh');
      } else {
        Logger.error(`User not signed in! [MIDDLEWARE]`);

        return res.status(403).send('signin');
      }
    }

    next();
  }
}
