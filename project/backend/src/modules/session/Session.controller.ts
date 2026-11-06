import {
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  type RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SessionService } from './Session.service';
import { AuthGuard } from '../auth/Auth.guard';
import {
  get_n_occurrences,
  get_next_session,
  repeat_dates_weekly,
} from '../../utils/session_utils';
import { type ControllerType } from '../../utils/handler_utils';
import { Request, type Response } from 'express';
import Handlers, { PATH } from './Session.handlers';
import { Decorate } from '@/src/utils/controller_utils';
import { gen_error } from '../Error';
import { SessionCompletion } from '@/src/entities/Session';
import { AuthService } from '../auth/Auth.service';
import { ClientService } from '../client/Client.service';
import {
  execute_if_administrator,
  execute_if_authorized,
} from '@/src/utils/auth_utils';
import { StudentService } from '../student/Student.service';

const MAX_RECURS = 20;

@Controller(PATH)
@UseGuards(AuthGuard)
export class SessionController {
  private logger: Logger = new Logger('SessionController');

  constructor(
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
    private readonly clientService: ClientService,
    private readonly studentService: StudentService,
  ) {}

  @Decorate(Handlers.FindAll)
  async findAll(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAll> {
    return await Handlers.FindAll.ControllerCall(req, res, async (_data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const sessions = await this.sessionService.findAll();

        return sessions;
      });
    });
  }

  @Decorate(Handlers.FindAllUpcoming)
  async findAllUpcoming(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAllUpcoming> {
    return await Handlers.FindAllUpcoming.ControllerCall(
      req,
      res,
      async (_data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const sessions =
              await this.sessionService.findAllFutureOfActiveStudents();
            const next_sessions = repeat_dates_weekly(sessions, 20);

            return next_sessions;
          },
        );
      },
    );
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
          const session = await this.sessionService.findOne(data.params.id);

          if (session == null) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
          }

          return session;
        },
        async () => {
          const myClient = await this.clientService.findOneOfTokens(req);

          if (myClient == null)
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

          const session = await this.sessionService.findOne(data.params.id);
          if (session == null)
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

          // Check if any student has this client
          for (const student of session.students) {
            if (student.client.id == myClient.id) {
              return session;
            }
          }

          throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
        },
      );
    });
  }

  @Decorate(Handlers.FindNextOfClient)
  async findNextOfClient(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindNextOfClient> {
    return await Handlers.FindNextOfClient.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const session = await this.sessionService.findNextOfClient(
              data.params.id,
            );

            return session;
          },
          async (authTkn) => {
            if (data.params.id != authTkn?.user?.userid) {
              return null;
            }

            const session = await this.sessionService.findNextOfClient(
              authTkn.user.userid,
            );

            return session;
          },
        );
      },
    );
  }

  @Decorate(Handlers.FindFutureDatesOf)
  async findFutureDatesOf(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindFutureDatesOf> {
    return await Handlers.FindFutureDatesOf.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const session = await this.sessionService.findOne(data.params.id);

            if (session == null) {
              throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
            }

            if (session.completed || session.every == 0) {
              throw new HttpException(
                'Not recurring',
                HttpStatus.UNPROCESSABLE_ENTITY,
              );
            }

            const sessions = get_n_occurrences(session, MAX_RECURS);

            return sessions;
          },
          async () => {
            const myClient = await this.clientService.findOneOfTokens(req);

            if (myClient == null)
              throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

            const session = await this.sessionService.findOne(data.params.id);
            if (session == null)
              throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

            // Check if any student has this client
            let allowed = false;
            for (const student of session.students) {
              if (student.client.id == myClient.id) {
                allowed = true;
                break;
              }
            }

            if (!allowed) {
              throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
            }

            if (session.completed || session.every == 0) {
              throw new HttpException(
                'Not recurring',
                HttpStatus.UNPROCESSABLE_ENTITY,
              );
            }

            const sessions = get_n_occurrences(session, MAX_RECURS);

            return sessions;
          },
        );
      },
    );
  }

  @Decorate(Handlers.Submit)
  async submit(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.Submit> {
    return await Handlers.Submit.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const result = await this.sessionService.submit(
          data.params.id,
          data.params.variant,
          data.body,
        );
        if (result != undefined) return result;
        return null;
      });
    });
  }

  @Decorate(Handlers.Create)
  async create(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.Create> {
    return await Handlers.Create.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const now = Date.now();

        if (now > data.body.date.getTime()) {
          const session = await this.sessionService.create({
            ...data.body,
            completed: SessionCompletion.COMPLETED,
            every: 0,
            ends: undefined,
          });

          if ('error' in session) return session;

          if (data.body.every > 0) {
            const next_session = get_next_session({
              date: session.date,
              every: data.body.every,
              ends: data.body.ends || null,
              index: 0,
            });
            if (!next_session) return gen_error('no next session on every > 0');

            await this.sessionService.removeOneInSeries(session.id, 1, true);
            await this.sessionService.create({
              ...data.body,
              date: next_session.date,
              completed: SessionCompletion.NONE,
            });
          }

          return session;
        } else {
          const session = await this.sessionService.create({
            ...data.body,
            completed: SessionCompletion.NONE,
          });

          return session;
        }
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
        await this.sessionService.remove(data.params.id);
        return null;
      });
    });
  }

  @Decorate(Handlers.RemoveOneInSeries)
  async removeOneInSeries(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.RemoveOneInSeries> {
    return await Handlers.RemoveOneInSeries.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const result = await this.sessionService.removeOneInSeries(
              data.params.id,
              data.params.index,
            );
            return result || null;
          },
        );
      },
    );
  }

  @Decorate(Handlers.FindAllByFilter)
  async findAllByFilter(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAllByFilter> {
    return await Handlers.FindAllByFilter.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            if (
              !data.body.start &&
              !data.body.end &&
              !data.body.student_id &&
              !data.body.client_id &&
              !data.body.completed
            ) {
              throw new HttpException(
                'No Filters Applied',
                HttpStatus.BAD_REQUEST,
              );
            }

            return await this.sessionService.findAllByFilter(data.body);
          },
          async () => {
            const myClient = await this.clientService.findOneOfTokens(req);

            if (myClient == null) return [];

            if (data.body.student_id) {
              const myStudents = await this.studentService.findAllOfClient(
                myClient.id,
              );

              const allowed = myStudents.reduce((agg: boolean, next) => {
                if (agg == true) return agg;

                return next.client.id == myClient.id;
              }, false);

              if (!allowed) {
                return [];
              }
            }

            if (data.body.client_id) {
              if (data.body.client_id != myClient.id) return [];
            }

            if (!data.body.client_id && !data.body.student_id) return [];

            // At this point it's definitely allowed
            return await this.sessionService.findAllByFilter(data.body);
          },
        );
      },
    );
  }

  @Decorate(Handlers.Reschedule)
  async Reschedule(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.Reschedule> {
    return await Handlers.Reschedule.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const result = await this.sessionService.reschedule(
          data.params.id,
          data.params.index,
          data.body,
        );
        return result || null;
      });
    });
  }

  @Decorate(Handlers.AddStudentToSession)
  async addStudentToSession(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.AddStudentToSession> {
    return await Handlers.AddStudentToSession.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const res = await this.sessionService.add_student_to_session(
              data.params.studentId,
              data.params.sessionId,
            );

            return res || null;
          },
        );
      },
    );
  }

  @Decorate(Handlers.RemoveStudentFromSession)
  async removeStudentFromSession(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.AddStudentToSession> {
    return await Handlers.AddStudentToSession.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const res = await this.sessionService.remove_student_from_session(
              data.params.studentId,
              data.params.sessionId,
            );

            return res || null;
          },
        );
      },
    );
  }

  @Decorate(Handlers.AddNoteToSession)
  async addNoteToSession(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.AddNoteToSession> {
    return Handlers.AddNoteToSession.ControllerCall(req, res, async (data) => {
      return execute_if_administrator(this.authService, req, res, async () => {
        const result = await this.sessionService.add_note_to_session(
          data.params.studentId,
          data.params.sessionId,
          data.body,
        );

        return result || null;
      });
    });
  }

  @Decorate(Handlers.GetNoteForSession)
  async getNoteForSession(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.GetNoteForSession> {
    return Handlers.GetNoteForSession.ControllerCall(req, res, async (data) => {
      return execute_if_authorized(
        this.authService,
        req,
        res,
        async (authTkn) => {
          const result = await this.sessionService.get_note_for_session(
            data.params.studentId,
            data.params.sessionId,
          );

          if (!result) return null;

          if (!authTkn?.groups.administrator) {
            // Not administrator, do not send tutor_plan
            result.tutor_plan = [];
          }

          return result;
        },
        async (authTkn) => {
          const student = await this.studentService.findOne(
            data.params.studentId,
          );
          return student?.client.id == authTkn?.user?.userid;
        },
      );
    });
  }
}
