import {
  type RawBodyRequest,
  Controller,
  HttpException,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './Student.service';
import { SessionService } from '../session/Session.service';
import { AuthGuard } from '../auth/Auth.guard';
import { type ControllerType } from '../../utils/handler_utils';
import { Request, type Response } from 'express';
import Handlers, { PATH } from './Student.handlers';
import { Decorate } from '@/src/utils/controller_utils';
import { execute_if_administrator } from '@/src/utils/auth_utils';
import { AuthService } from '../auth/Auth.service';
import { ClientService } from '../client/Client.service';
import { gen_error } from '../Error';

@Controller(PATH)
@UseGuards(AuthGuard)
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly sessionService: SessionService,
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
        const students = await this.studentService.findAll();
        return students;
      });
    });
  }

  @Decorate(Handlers.FindAllOfClient)
  async findAllOfClient(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.FindAllOfClient> {
    return await Handlers.FindAllOfClient.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            return this.studentService.findAllOfClient(data.params.id);
          },
          async (authTkn) => {
            if (authTkn?.user?.userid == data.params.id) {
              return this.studentService.findAllOfClient(authTkn.user.userid);
            } else {
              return [];
            }
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
          const student = await this.studentService.findOne(data.params.id);

          if (student == null) {
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
          }

          return student;
        },
        async () => {
          const myClient = await this.clientService.findOneOfTokens(req);

          if (myClient == null)
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

          const myStudents = await this.studentService.findAllOfClient(
            myClient.id,
          );
          const student = myStudents.find((s) => s.id == data.params.id);

          if (!student)
            throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

          return student;
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
        return await this.studentService.create(data.body);
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
            return this.studentService.toggleActive(data.params.id);
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
        return this.studentService.remove(data.params.id);
      });
    });
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
            const sessions =
              await this.sessionService.findAllCompletedOfStudent(
                data.params.id,
              );

            return sessions;
          },
          async () => {
            const myClient = await this.clientService.findOneOfTokens(req);
            if (myClient == null) return [];

            const myStudents = await this.studentService.findAllOfClient(
              myClient.id,
            );
            const student = myStudents.find((s) => s.id == data.params.id);
            if (!student) return [];

            const sessions =
              await this.sessionService.findAllCompletedOfStudent(student.id);

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
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const sessions = await this.sessionService.findAllFutureOfStudent(
              data.params.id,
            );

            return sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
          },
          async () => {
            const myClient = await this.clientService.findOneOfTokens(req);
            if (myClient == null) return [];

            const myStudents = await this.studentService.findAllOfClient(
              myClient.id,
            );
            const student = myStudents.find((s) => s.id == data.params.id);
            if (!student) return [];

            const sessions = await this.sessionService.findAllFutureOfStudent(
              student.id,
            );

            return sessions;
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
        const result = await this.studentService.rename(
          data.params.id,
          data.body,
        );
        return result || null;
      });
    });
  }

  @Decorate(Handlers.LoadStudentNote)
  async LoadStudentNote(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.LoadStudentNote> {
    return await Handlers.LoadStudentNote.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const result = await this.studentService.loadStudentNote(
              data.params.id,
            );
            return result;
          },
          async () => {
            const myClient = await this.clientService.findOneOfTokens(req);
            if (myClient == null) return gen_error('student does not exist');

            const myStudents = await this.studentService.findAllOfClient(
              myClient.id,
            );
            const student = myStudents.find((s) => s.id == data.params.id);
            if (!student) return gen_error('student does not exist');

            const result = await this.studentService.loadStudentNote(
              data.params.id,
            );
            return result;
          },
        );
      },
    );
  }

  @Decorate(Handlers.SaveStudentNote)
  async SaveStudentNote(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): ControllerType<typeof Handlers.SaveStudentNote> {
    return await Handlers.SaveStudentNote.ControllerCall(
      req,
      res,
      async (data) => {
        return execute_if_administrator(
          this.authService,
          req,
          res,
          async () => {
            const result = await this.studentService.saveStudentNote(
              data.params.id,
              data.body,
            );

            return result || null;
          },
          async () => {
            const myClient = await this.clientService.findOneOfTokens(req);
            if (myClient == null) return null;

            const myStudents = await this.studentService.findAllOfClient(
              myClient.id,
            );
            const student = myStudents.find((s) => s.id == data.params.id);
            if (!student) return null;

            const result = await this.studentService.saveStudentNote(
              data.params.id,
              data.body,
            );

            return result || null;
          },
        );
      },
    );
  }
}
