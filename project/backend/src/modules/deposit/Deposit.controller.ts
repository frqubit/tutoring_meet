import {
  type RawBodyRequest,
  Controller,
  HttpException,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { DepositService } from './Deposit.service';
import { AuthGuard } from '../auth/Auth.guard';
import { type ControllerType } from '../../utils/handler_utils';
import { Request, type Response } from 'express';
import Handlers, { PATH } from './Deposit.handlers';
import { Decorate } from '@/src/utils/controller_utils';
import { execute_if_administrator } from '@/src/utils/auth_utils';
import { AuthService } from '../auth/Auth.service';
import { ClientService } from '../client/Client.service';

@Controller(PATH)
@UseGuards(AuthGuard)
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
    private readonly authService: AuthService,
    private readonly clientService: ClientService,
  ) {}

  @Decorate(Handlers.FindAll)
  async findAll(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAll> {
    return await Handlers.FindAll.ControllerCall(req, res, async (_data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const deposits = await this.depositService.findAll();

        return deposits;
      });
    });
  }

  @Decorate(Handlers.FindOne)
  async findOne(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindOne> {
    return await Handlers.FindOne.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(
        this.authService,
        req,
        res,
        async () => {
          const deposit = await this.depositService.findOne(data.params.id);

          if (deposit == null) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
          }

          return deposit;
        },
        async () => {
          const myClient = await this.clientService.findOneOfTokens(req);

          if (myClient == null)
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

          const deposit = await this.depositService.findOne(data.params.id);
          if (deposit?.client.id != myClient.id)
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

          return deposit;
        },
      );
    });
  }

  @Decorate(Handlers.Create)
  async create(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.Create> {
    return await Handlers.Create.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const deposit = await this.depositService.create(data.body);

        return deposit;
      });
    });
  }

  @Decorate(Handlers.Remove)
  async remove(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.Remove> {
    return await Handlers.Remove.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        await this.depositService.remove(data.params.id);
        return {};
      });
    });
  }
}
