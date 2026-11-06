import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
  type RawBodyRequest,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, Tokens } from './Auth.service';
import type { Request, Response } from 'express';
import { DEV, WEBSITE_URI } from '@/src/config';
import dayjs from 'dayjs';
import Handlers from './Auth.handlers';
import { Decorate } from '@/src/utils/controller_utils';
import { type ControllerType } from '@/src/utils/handler_utils';
import { AuthProblem, execute_if_administrator } from '@/src/utils/auth_utils';
import {
  AnyVersion as AnyAuthTokenVersion,
  LatestVersion as LatestAuthTokenVersion,
} from '@/src/webdata/auth_token';
import { SerFailure } from '@/src/utils/serde_utils';

@Controller('auth')
export class AuthController {
  private logger: Logger = new Logger('AuthController');

  constructor(private readonly authService: AuthService) {}

  @Get('version')
  getVersion() {
    return { version: 3 };
  }

  // Development only
  @Get('devsignin')
  async devGetAuthTokenAs(
    @Query('clientid') clientid: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const oldauthtoken = await this.authService.getAuthToken(request);
    if (
      !DEV &&
      (oldauthtoken instanceof AuthProblem ||
        !oldauthtoken.groups.administrator)
    ) {
      // Only administrators allowed
      this.logger.error('Only administrators allowed');
      return;
    }

    const authtoken =
      await this.authService.devCreateAuthTokenForClient(+clientid);

    if (!(authtoken instanceof AuthProblem)) {
      const serialized = AnyAuthTokenVersion.ser(authtoken);
      if (!(serialized instanceof SerFailure)) {
        response.cookie('TAUTH', serialized, {
          expires: authtoken.expires,
          path: '/',
          domain: DEV ? undefined : '.mindswithwings.com',
        });
      }
    }

    const isadminpage =
      authtoken instanceof AuthProblem ? false : authtoken.user == undefined;

    response.redirect(`${WEBSITE_URI}${isadminpage ? '/admin' : ''}`);
  }

  @Get()
  async getTokensFromCode(
    @Query('code') code: string,
    @Query('state') state: string | null,
    @Res({ passthrough: true }) response: Response,
  ) {
    let tokens: Tokens | null = null;
    try {
      tokens = await this.authService.getTokensFromCode(code);
    } catch (e) {
      console.error(e);
      throw new HttpException(e as Error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (
      tokens &&
      tokens.access_token &&
      tokens.id_token &&
      !('error' in tokens)
    ) {
      const idExpires = new Date();
      idExpires.setSeconds(idExpires.getSeconds() + 3600);
      response.cookie('TAUTHI', tokens.id_token, {
        expires: idExpires,
        path: '/',
        domain: DEV ? undefined : '.mindswithwings.com',
      });
      response.cookie('TAUTHA', tokens.access_token, {
        expires: idExpires,
        path: '/',
        domain: DEV ? undefined : '.mindswithwings.com',
      });

      if (tokens.refresh_token) {
        const refreshExpire = dayjs(new Date()).add(5, 'days').toDate();
        response.cookie('TAUTHR', tokens.refresh_token, {
          expires: refreshExpire,
          path: '/',
          domain: DEV ? undefined : '.mindswithwings.com',
        });
      }

      const parsed_id = await this.authService.idVerifier.verify(
        tokens.id_token,
      );
      const authtoken = await this.authService.createAuthToken(parsed_id);
      if (!(authtoken instanceof AuthProblem)) {
        const serialized = AnyAuthTokenVersion.ser(authtoken);
        if (!(serialized instanceof SerFailure)) {
          response.cookie('TAUTH', serialized, {
            expires: authtoken.expires,
            path: '/',
            domain: DEV ? undefined : '.mindswithwings.com',
          });
        }
      }

      response.redirect(`${WEBSITE_URI}${state ? atob(state) : ''}`);
    } else {
      throw new HttpException(
        JSON.stringify(tokens),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/refresh')
  async refreshTokens(
    @Req() request: Request,
    @Query('state') state: string | null,
    @Res({ passthrough: true }) response: Response,
  ) {
    Logger.log('HIT ME 2');

    const refresh_token = request.cookies['TAUTHR'] as string | undefined;
    if (!refresh_token) {
      throw new UnauthorizedException();
    }

    let tokens: Tokens | null = null;
    try {
      tokens = await this.authService.getTokensFromRefreshToken(refresh_token);
    } catch (e) {
      console.error(e);
      throw new HttpException(e as Error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (
      tokens &&
      tokens.access_token &&
      tokens.id_token &&
      !('error' in tokens)
    ) {
      const idExpires = new Date();
      idExpires.setSeconds(idExpires.getSeconds() + 3600);
      response.cookie('TAUTHI', tokens.id_token, {
        expires: idExpires,
        path: '/',
        domain: DEV ? undefined : '.mindswithwings.com',
      });
      response.cookie('TAUTHA', tokens.access_token, {
        expires: idExpires,
        path: '/',
        domain: DEV ? undefined : '.mindswithwings.com',
      });

      const parsed_id = await this.authService.idVerifier.verify(
        tokens.id_token,
      );
      const authtoken = await this.authService.createAuthToken(parsed_id);
      if (!(authtoken instanceof AuthProblem)) {
        const serialized = AnyAuthTokenVersion.ser(authtoken);
        if (!(serialized instanceof SerFailure)) {
          response.cookie('TAUTH', serialized, {
            expires: authtoken.expires,
            path: '/',
            domain: DEV ? undefined : '.mindswithwings.com',
          });
        }
      }

      if (tokens.refresh_token) {
        const refreshExpire = dayjs(new Date()).add(5, 'days').toDate();
        response.cookie('TAUTHR', tokens.refresh_token, {
          expires: refreshExpire,
          path: '/',
          domain: DEV ? undefined : '.mindswithwings.com',
        });
      }

      response.redirect(`${WEBSITE_URI}${state ? atob(state) : ''}`);
    } else {
      throw new HttpException(
        JSON.stringify(tokens),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/logout')
  removeAuthTokens(@Res({ passthrough: true }) response: Response) {
    const cookieSettings = {
      path: '/',
      domain: DEV ? undefined : '.mindswithwings.com',
    };

    response.clearCookie('TAUTHA', cookieSettings);
    response.clearCookie('TAUTHI', cookieSettings);
    response.clearCookie('TAUTHR', cookieSettings);
    response.clearCookie('TAUTH', cookieSettings);

    this.logger.log('Used Logout');

    response.redirect(WEBSITE_URI);
  }

  @Decorate(Handlers.GetPublicKey)
  async getPublicKey(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.GetPublicKey> {
    return await Handlers.GetPublicKey.ControllerCall(req, res, (_data) => {
      const publicKeyB64 = this.authService.getPublicKeyData();
      return Buffer.from(publicKeyB64, 'base64');
    });
  }

  @Decorate(Handlers.CreateUserFromClient)
  async createUserFromClient(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.CreateUserFromClient> {
    return await Handlers.CreateUserFromClient.ControllerCall(
      req,
      res,
      async (data) => {
        return this.authService.createUserForClient(
          data.params.id,
          data.body.email,
        );
      },
    );
  }

  @Decorate(Handlers.GetMyUserInfo)
  async getMyUserInfo(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.GetMyUserInfo> {
    return await Handlers.GetMyUserInfo.ControllerCall(
      req,
      res,
      async (_data) => {
        return await this.authService.getMyUserInfo(req);
      },
    );
  }
}
