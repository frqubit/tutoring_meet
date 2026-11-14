import {
  type RawBodyRequest,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from './Client.service';
import { DepositService } from '../deposit/Deposit.service';
import { SessionService } from '../session/Session.service';
import { AuthGuard } from '../auth/Auth.guard';
import { type ControllerType } from '../../utils/handler_utils';
import { Request, type Response } from 'express';
import Handlers, { PATH } from './Client.handlers';
import { Decorate } from '@/src/utils/controller_utils';
import { AuthService } from '../auth/Auth.service';
import {
  execute_if_administrator,
  execute_if_authorized,
} from '@/src/utils/auth_utils';
import { SessionCompletion } from '@/src/entities/Session.enum';
import dayjs from 'dayjs';
import { pad2zeros } from '@/src/utils/format_utils';
import { repeat_dates_weekly } from '@/src/utils/session_utils';
import { C_MYSELF } from '@/src/utils/constants';

@Controller(PATH)
@UseGuards(AuthGuard)
export class ClientController {
  private logger: Logger = new Logger('Client');

  constructor(
    private readonly clientService: ClientService,
    private readonly depositService: DepositService,
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
  ) {}

  @Decorate(Handlers.FindAll)
  async findAll(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAll> {
    return await Handlers.FindAll.ControllerCall(req, res, async (_data) => {
      return execute_if_authorized(
        this.authService,
        req,
        res,
        async () => {
          const clients = await this.clientService.findAll();
          return clients.map((c) => ({
            ...c,
            user_account: c.user_account || null,
          }));
        },
        (authTkn) => authTkn?.groups.masquerader ?? false,
      );
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
          const client = await this.clientService.findOne(data.params.id);

          if (client == null) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
          }

          return {
            ...client,
            user_account: client.user_account || null,
          };
        },
        async (authTkn) => {
          if (authTkn?.user?.userid != data.params.id) {
            // They don't get to know lol
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
          }

          const client = await this.clientService.findOne(data.params.id);

          if (client == null) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
          }

          return {
            ...client,
            user_account: client.user_account || null,
          };
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
        const c = await this.clientService.create(data.body);
        return {
          ...c,
          user_account: c.user_account || null,
        };
      });
    });
  }

  @Decorate(Handlers.ToggleActive)
  async toggleActive(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.ToggleActive> {
    return await Handlers.ToggleActive.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const c = await this.clientService.toggleActive(data.params.id);
            if (c == null) return c;

            return {
              ...c,
              user_account: c.user_account || null,
            };
          },
        );
      },
    );
  }

  @Decorate(Handlers.Remove)
  async remove(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.Remove> {
    return await Handlers.Remove.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        return this.clientService.remove(data.params.id);
      });
    });
  }

  @Decorate(Handlers.FindAllDepositsOf)
  async findAllDepositsOf(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAllDepositsOf> {
    return await Handlers.FindAllDepositsOf.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_authorized(
          this.authService,
          req,
          res,
          async (authTkn) => {
            const client_id = C_MYSELF.matches(data.params.id)
              ? authTkn?.user?.userid
              : data.params.id;

            if (!client_id) return [];

            const deposits =
              await this.depositService.findAllOfClient(client_id);

            return deposits;
          },
          (authTkn) => {
            return (
              C_MYSELF.matches(data.params.id) ||
              data.params.id == authTkn?.user?.userid
            );
          },
        );
      },
    );
  }

  @Decorate(Handlers.FindAllCompletedSessionsOf)
  async findAllCompletedSessionsOf(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAllCompletedSessionsOf> {
    return await Handlers.FindAllCompletedSessionsOf.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const sessions = await this.sessionService.findAllCompletedOfClient(
              data.params.id,
            );

            return sessions;
          },
          async () => {
            const myClient = await this.clientService.findOneOfTokens(req);

            if (myClient?.id != data.params.id) return [];

            const sessions = await this.sessionService.findAllCompletedOfClient(
              myClient.id,
            );

            return sessions;
          },
        );
      },
    );
  }

  @Decorate(Handlers.FindAllFutureSessionsOf)
  async findAllFutureSessionsOf(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAllFutureSessionsOf> {
    return await Handlers.FindAllFutureSessionsOf.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_authorized(
          this.authService,
          req,
          res,
          async (authTkn) => {
            const client_id = C_MYSELF.matches(data.params.id)
              ? authTkn?.user?.userid
              : data.params.id;

            if (!client_id) return [];

            const sessions =
              await this.sessionService.findAllFutureOfClient(client_id);

            // Required since repeat_dates_weekly removes this getter
            const with_students = sessions.map((ss) => ({
              ...ss,
              students: ss.students,
            }));

            const val = repeat_dates_weekly(with_students, 20);

            return val;
          },
          (authTkn) =>
            C_MYSELF.matches(data.params.id)
              ? authTkn?.user?.userid !== undefined
              : authTkn?.user?.userid == data.params.id,
        );
      },
    );
  }

  @Decorate(Handlers.FindRecentCompletedSessionsOf)
  async findRecentCompletedSessionsOf(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindRecentCompletedSessionsOf> {
    return await Handlers.FindRecentCompletedSessionsOf.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const sessions =
              await this.sessionService.findRecentCompletedOfClient(
                data.params.id,
              );

            return sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
          },
          async (authTkn) => {
            if (authTkn?.user?.userid != data.params.id) return [];

            const sessions =
              await this.sessionService.findRecentCompletedOfClient(
                authTkn.user.userid,
              );

            return sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
          },
        );
      },
    );
  }

  @Decorate(Handlers.GetNextInvoiceOf)
  async GetNextInvoiceOf(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.GetNextInvoiceOf> {
    return Handlers.GetNextInvoiceOf.ControllerCall(req, res, async (data) => {
      return execute_if_authorized(
        this.authService,
        req,
        res,
        async (authTkn) => {
          const client_id = C_MYSELF.matches(data.params.id)
            ? authTkn?.user?.userid
            : data.params.id;

          if (!client_id) return null;

          const client = await this.clientService.findOne(client_id);
          if (client == null) return null;

          const all_past_invoices =
            await this.depositService.findAllOfClient(client_id);

          const last_invoices = all_past_invoices.toSorted(
            (a, b) => a.date.getTime() - b.date.getTime(),
          );
          const last_invoice_date =
            last_invoices.length > 0
              ? last_invoices[last_invoices.length - 1].date
              : null;

          const last_invoice_month = last_invoice_date
            ? last_invoice_date.getMonth()
            : new Date().getMonth();

          const client_tz = client?.tz || 'America/New_York';

          const month_number = ((last_invoice_month + 1) % 12) + 1;
          const next_month_number = month_number == 12 ? 1 : month_number + 1;

          // the +() is for adding an extra year when month is January
          const year_number =
            (new Date().getFullYear() % 100) + +(month_number == 1);
          const next_year_number =
            month_number == 12 ? year_number + 1 : year_number;

          const start_date = dayjs.tz(
            `20${year_number}-${pad2zeros(month_number)}-01 00:00`,
            client_tz,
          );

          const end_date = dayjs.tz(
            `20${next_year_number}-${pad2zeros(next_month_number)}-01 00:00`,
            client_tz,
          );

          const nextMonthSessions = await this.sessionService.findAllByFilter({
            client_id: client.id,
            start: start_date.toDate(),
            end: end_date.toDate(),
            max_count: 1000,
          });

          const month_before_number = month_number == 1 ? 12 : month_number - 1;
          const year_before_number =
            month_number == 1 ? year_number - 1 : year_number;

          const before_start_date = dayjs.tz(
            `20${year_before_number}-${pad2zeros(month_before_number)}-01 00:00`,
            client_tz,
          );

          const beforeUncompleteSessions =
            await this.sessionService.findAllByFilter({
              client_id: client.id,
              // start: before_start_date.toDate(),
              end: start_date.toDate(),
              completed: false,
              max_count: 1000,
            });

          // in cents
          const chargesMonthBeforeNotDone = Math.floor(
            (beforeUncompleteSessions
              .map((s) => s.minutes / s.students.length)
              .reduce((agg, next) => agg + next, 0) *
              3500) /
              60,
          );

          const remainingBalance =
            (await this.balance_calculation(client.id)) -
            chargesMonthBeforeNotDone;

          const charges = nextMonthSessions.map((s) => {
            const session_type =
              s.students.length > 1 ? 'Shared Session' : '1-on-1 Session';

            const student = s.students.find((s) => s.client.id == client.id);
            const cents = Math.floor(
              (s.minutes * 3500) / 60 / s.students.length,
            );

            return {
              name: `${session_type} (${s.minutes} minutes)`,
              student_name: student?.name || 'Undefined',
              date: s.date,
              cents,
            };
          });

          if (remainingBalance != 0) {
            charges.push({
              name:
                remainingBalance > 0
                  ? 'Expected Leftover Balance'
                  : 'Additional Last Month',
              student_name: '',
              date: start_date.toDate(),
              cents: -remainingBalance,
            });
          }

          return {
            charges,
            month_number: (last_invoice_month + 1) % 12,
          };
        },
        (authTkn) => {
          return authTkn?.user?.userid == data.params.id;
        },
      );
    });
  }

  async balance_calculation(id: number): Promise<number> {
    const allSessions = await this.sessionService.findAllCompletedOfClient(id);
    const allDeposits = await this.depositService.findAllOfClient(id);

    const totalDeposits = allDeposits
      .map((d) => d.cents)
      .reduce((agg, next) => agg + next, 0);

    const totalMinutes = allSessions.reduce((agg, next) => {
      const cancelWeight =
        next.completed == SessionCompletion.LATECANCEL ? 0.5 : 1;

      return agg + (next.minutes / next.students.length) * cancelWeight;
    }, 0);

    return totalDeposits - (totalMinutes / 60) * 3500;
  }

  @Decorate(Handlers.GetBalanceOf)
  async GetBalanceOf(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.GetBalanceOf> {
    return await Handlers.GetBalanceOf.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_authorized(
          this.authService,
          req,
          res,
          async (authTkn) => {
            const client_id = C_MYSELF.matches(data.params.id)
              ? authTkn?.user?.userid
              : data.params.id;

            if (!client_id) return 0;

            return this.balance_calculation(client_id);
          },
          (authTkn) => {
            return (
              C_MYSELF.matches(data.params.id) ||
              data.params.id == authTkn?.user?.userid
            );
          },
        );
      },
    );
  }

  @Decorate(Handlers.Rename)
  async Rename(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.Rename> {
    return await Handlers.Rename.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const c = await this.clientService.rename(data.params.id, data.body);
        if ('error' in c) return c;

        return {
          ...c,
          user_account: c.user_account || null,
        };
      });
    });
  }

  @Decorate(Handlers.MergeInto)
  async MergeInto(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.MergeInto> {
    return await Handlers.MergeInto.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const output = await this.clientService.merge_into(
          data.params.source,
          data.params.target,
        );
        return output || null;
      });
    });
  }
}
