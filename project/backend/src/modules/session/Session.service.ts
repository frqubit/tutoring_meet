import { Session, SessionCompletion } from '@/src/entities/Session';
import { Injectable, Logger, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import {
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Or,
  Repository,
} from 'typeorm';
import {
  StudentService,
  StudentServiceModule,
} from '../student/Student.service';
import { Error, NodeError, gen_error } from '../Error';
import { Student } from '@/src/entities/Student';
import {
  get_n_occurrences,
  get_next_session,
  repeat_dates_until,
} from '@/src/utils/session_utils';
import dayjs from 'dayjs';
import { MmSessionStudent } from '@/src/entities/MmSessionStudent';
import { ClientService, ClientServiceModule } from '../client/Client.service';
import {
  WebDataService,
  WebDataServiceModule,
} from '../webdata/WebData.service';
import {
  AnyVersion as AnySessionNoteVersion,
  LatestVersion as LatestSessionNoteVersion,
  LatestFormat as LatestSessionNoteFormat,
} from '@/src/webdata/session_note';
import { SerdeT } from '@/src/utils/serde_utils';

const MS_IN_WEEK = 1000 * 60 * 60 * 24 * 7;

type SessionServiceCreateData = {
  student_id: number;
  date: Date;
  minutes: number;
  completed: SessionCompletion;
  every: number;
  ends?: Date;
};

@Injectable()
export class SessionService {
  private logger: Logger = new Logger('SessionService');

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(MmSessionStudent)
    private mmSessionStudentRepository: Repository<MmSessionStudent>,
    private studentService: StudentService,
    private webdataService: WebDataService,
  ) {}

  async create(data: SessionServiceCreateData): Promise<Session | Error> {
    const student = await this.studentService.findOne(data.student_id);

    if (student === null) {
      return gen_error("This student doesn't exist!");
    }

    const session = await this.sessionRepository.save(Session.create(data));

    await this.mmSessionStudentRepository.save(
      MmSessionStudent.create({
        student,
        session,
      }),
    );

    const loaded_session = await this.sessionRepository.findOne({
      where: { id: session.id },
      relations: { students_r: { student: { client: true } } },
    });

    if (loaded_session === null) {
      throw new NodeError('Session just created is somehow null when loaded');
    }

    return loaded_session;
  }

  async remove(id: number): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { students_r: { student: { client: true } } },
    });
    if (session) {
      for (const mm of session.students_r) {
        await this.mmSessionStudentRepository.remove(mm);
      }
      await this.sessionRepository.delete(id);
    }
  }

  async findAll(): Promise<Session[]> {
    return await this.sessionRepository.find({
      relations: { students_r: { student: { client: true } } },
    });
  }

  async findOne(id: number): Promise<Session | null> {
    const val = await this.sessionRepository.findOne({
      where: { id },
      relations: { students_r: { student: { client: true } } },
    });

    return val;
  }

  async findAllCompletedOfStudent(student_id: number): Promise<Session[]> {
    const relations = await this.mmSessionStudentRepository.find({
      where: {
        student: { id: student_id },
        session: {
          completed: Not(SessionCompletion.NONE),
        },
      },
      relations: { session: { students_r: { student: { client: true } } } },
    });

    const sessions = relations.map((v) => v.session);

    return sessions;
  }

  async findAllCompletedOfClient(client_id: number): Promise<Session[]> {
    const relations = await this.mmSessionStudentRepository.find({
      where: {
        student: { client: { id: client_id } },
        session: {
          completed: Not(SessionCompletion.NONE),
        },
      },
      relations: { session: { students_r: { student: { client: true } } } },
    });

    const sessions = relations.map((v) => v.session);

    return sessions;
  }

  async findRecentCompletedOfClient(client_id: number): Promise<Session[]> {
    const relations = await this.mmSessionStudentRepository.find({
      where: {
        student: { client: { id: client_id } },
        session: {
          completed: Not(SessionCompletion.NONE),
        },
      },
      relations: { session: { students_r: { student: { client: true } } } },
      order: { session: { date: 'DESC' } },
      take: 10,
    });

    const sessions = relations.map((v) => v.session);

    return sessions;
  }

  async findAllFutureOfStudent(student_id: number): Promise<Session[]> {
    const relations = await this.mmSessionStudentRepository.find({
      where: {
        student: { id: student_id },
        session: {
          completed: SessionCompletion.NONE,
        },
      },
      relations: { session: { students_r: { student: { client: true } } } },
    });

    const sessions = relations.map((v) => v.session);

    return sessions;
  }

  async findAllFutureOfClient(client_id: number): Promise<Session[]> {
    const relations = await this.mmSessionStudentRepository.find({
      where: {
        student: { client: { id: client_id } },
        session: {
          completed: SessionCompletion.NONE,
        },
      },
      relations: { session: { students_r: { student: { client: true } } } },
    });

    const sessions = relations.map((v) => v.session);

    return sessions;
  }

  async findNextOfClient(client_id: number): Promise<Session | null> {
    const relation = await this.mmSessionStudentRepository
      .find({
        where: {
          student: { client: { id: client_id } },
          session: {
            completed: SessionCompletion.NONE,
          },
        },
        relations: { session: { students_r: { student: { client: true } } } },
        order: {
          session: { date: 'ASC' },
        },
        take: 1,
      })
      .then((rs) => (rs.length > 0 ? rs[0] : undefined));

    if (!relation) return null;

    const session = {
      ...relation.session,
      students: relation.session.students_r.map((sr) => sr.student),
    };

    return session;
  }

  async add_events_to_session(
    session_id: number,
    student_id: number,
    events: string[],
  ) {
    const note = await this.get_note_for_session(student_id, session_id).then(
      async (n) => {
        if (n) return n;

        const session = await this.sessionRepository.findOneBy({
          id: session_id,
        });
        if (!session) return;

        return {
          session_date: session.date,
          session_id,
          subject: '',
          tutor_plan: [],
          event_summary: [],
        };
      },
    );

    if (!note) return;

    note.event_summary = events;
    await this.add_note_to_session(session_id, student_id, note);
  }

  async submit(
    id: number,
    variant: SessionCompletion,
    events: string[],
  ): Promise<undefined | Error> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { students_r: { student: { client: true } } },
    });
    if (session === null) {
      return gen_error("This session doesn't exist!");
    }

    if (session.date.getTime() > Date.now()) {
      return gen_error('This session is in the future!');
    }

    if (session.completed == SessionCompletion.NONE) {
      const nextSession = get_next_session(session);

      Logger.log('MARKING COMPLETE');
      session.completed = variant;
      session.every = 0;
      await this.sessionRepository.save(session);

      if (nextSession != null) {
        Logger.log('MAKING NEXT');

        const newSession = Session.create(nextSession);
        newSession.completed = SessionCompletion.NONE;

        await this.sessionRepository.save(newSession);

        for (const student of session.students_r.map((sr) => sr.student)) {
          await this.mmSessionStudentRepository.save(
            MmSessionStudent.create({
              student,
              session: newSession,
            }),
          );
        }

        Logger.warn(newSession);
      }

      const student_ids = session.students_r.map((sr) => sr.student.id);
      await Promise.all(
        student_ids.map((s) => this.add_events_to_session(id, s, events)),
      );
    } else {
      return gen_error('This session is already completed!');
    }
  }

  async removeOneInSeries(id: number, index: number, after_too?: boolean) {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { students_r: { student: { client: true } } },
    });
    if (session === null) {
      return gen_error("This session doesn't exist!");
    }

    if (session.every > 0) {
      const occurrences =
        Math.floor(
          (session.ends
            ? (session.ends.getTime() - session.date.getTime()) / MS_IN_WEEK
            : Infinity) / session.every,
        ) + 1;
      // If the index is higher than the number of recurrences, don't even try
      if (index >= occurrences) {
        return gen_error('The session index does not exist!');
      }

      // Find future session of student
      const nextSession = get_n_occurrences(session, index + 2)[index + 1];

      if (nextSession != undefined && !after_too) {
        const newRecurrings = Session.create({
          date: nextSession.date,
          minutes: session.minutes,
          ends: session.ends,
          completed: SessionCompletion.NONE,
          every: occurrences < 2 ? 0 : session.every,
        });

        await this.sessionRepository.save(newRecurrings);

        for (const student of session.students_r.map((sr) => sr.student)) {
          await this.mmSessionStudentRepository.save(
            MmSessionStudent.create({
              student,
              session: newRecurrings,
            }),
          );
        }
      }

      if (index == 0) {
        // remove the links first
        const mmSessionStudents = session.students_r;
        Logger.warn('REMOVING');
        for (const mm of mmSessionStudents) {
          await this.mmSessionStudentRepository.remove(mm);
        }
        await this.remove(id);
      } else if (index == 1) {
        session.every = 0;
        session.ends = null;
        await this.sessionRepository.save(session);
      } else {
        const date_before = get_n_occurrences(session, index)[index - 1].date;
        session.ends = date_before;
        await this.sessionRepository.save(session);
      }
    } else {
      return gen_error('This session is not recurring!');
    }
  }

  async findAllFutureOfActiveStudents(): Promise<Session[]> {
    const relations = await this.mmSessionStudentRepository.find({
      where: {
        student: { active: true },
        session: { completed: SessionCompletion.NONE },
      },
      relations: { session: { students_r: { student: { client: true } } } },
    });

    const sessions = relations
      .map((v) => v.session)
      .map((v) => ({
        ...v,
        students: v.students_r.map((v2) => v2.student),
      }));

    return sessions;
  }

  async findAllByFilter(filter: {
    student_id?: number;
    client_id?: number;
    start?: Date;
    end?: Date;
    completed?: boolean;
    max_count?: number;
  }): Promise<Session[]> {
    const completed_filter =
      filter.completed === true
        ? Not(SessionCompletion.NONE)
        : filter.completed === false
          ? SessionCompletion.NONE
          : undefined;

    const relations = await this.mmSessionStudentRepository.find({
      where: {
        student: { id: filter.student_id, client: { id: filter.client_id } },
        session: {
          date: filter.end ? LessThanOrEqual(filter.end) : undefined,
          ends: filter.start
            ? Or(IsNull(), MoreThanOrEqual(filter.start))
            : undefined,
          completed: completed_filter,
        },
      },
      relations: { session: { students_r: { student: { client: true } } } },
    });

    let sessions = relations
      .map((v) => v.session)
      .map((v) => ({
        ...v,
        students: v.students_r.map((v2) => v2.student),
      }));

    // Duplicates will appear when students share sessions, remove them
    const dedupedSessions: typeof sessions = [];
    const dedupedIds: number[] = [];
    for (const session of sessions) {
      if (dedupedIds.indexOf(session.id) == -1) {
        dedupedIds.push(session.id);
        dedupedSessions.push(session);
      }
    }
    sessions = dedupedSessions;

    let output: Session[] = [];
    for (let i = 0; i < sessions.length; i++) {
      const current = sessions[i];

      if (filter.start && current.date < filter.start) {
        // Cannot get future session
        if (current.every == 0) continue;

        const weeks_away =
          Math.ceil(
            (filter.start.getTime() - current.date.getTime()) /
              MS_IN_WEEK /
              current.every,
          ) * current.every;

        // TODO Make timezone not matter
        current.date = dayjs(current.date)
          .tz('America/New_York')
          .add(weeks_away, 'weeks')
          .toDate();

        current.index += weeks_away / current.every;

        if (filter.end && current.date > filter.end) continue;
      }

      output.push(current);
    }

    output = repeat_dates_until(output, filter.max_count || 20, filter.end);

    return output;
  }

  async reschedule(
    id: number,
    index: number,
    data: {
      date: Date;
      minutes: number;
      all: boolean;
    },
  ) {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { students_r: { student: { client: true } } },
    });
    if (!session) {
      return gen_error('session does not exist');
    }

    if (session.every == 0) {
      if (index > 0)
        return gen_error(
          'supplied future index to non-repeating session reschedule',
        );

      session.date = data.date;
      session.minutes = data.minutes;

      await this.sessionRepository.save(session);
    } else {
      const occurrences =
        Math.floor(
          (session.ends
            ? (session.ends.getTime() - session.date.getTime()) / MS_IN_WEEK
            : Infinity) / session.every,
        ) + 1;

      if (index >= occurrences) {
        return gen_error('this index does not exist');
      }

      const moved_session = Session.create({
        date: data.date,
        minutes: data.minutes,
        completed: SessionCompletion.NONE,
        every: data.all ? session.every : 0,
      });

      await this.removeOneInSeries(id, index, data.all);
      await this.sessionRepository.save(moved_session);

      for (const student of session.students_r.map((sr) => sr.student)) {
        await this.mmSessionStudentRepository.save(
          MmSessionStudent.create({
            student,
            session: moved_session,
          }),
        );
      }
    }
  }

  async add_student_to_session(
    student_id: number,
    session_id: number,
  ): Promise<undefined | Error> {
    const session = await this.sessionRepository.findOneBy({ id: session_id });
    const student = await this.studentService.findOne(student_id);

    if (!session || !student) {
      return gen_error("student or session doesn't exist");
    }

    const mmSessionStudent = MmSessionStudent.create({ session, student });
    await this.mmSessionStudentRepository.save(mmSessionStudent);
  }

  async remove_student_from_session(
    student_id: number,
    session_id: number,
  ): Promise<undefined | Error> {
    const session = await this.sessionRepository.findOne({
      where: { id: session_id },
      relations: { students_r: { student: { client: true } } },
    });

    if (!session) {
      return gen_error("session doesn't exist");
    }

    const mm = session.students_r.find((r) => r.student.id == student_id);

    if (!mm) {
      return gen_error('student is not assigned to session!');
    }

    if (session.students_r.length == 1) {
      return gen_error('cannot remove last student!');
    }

    await this.mmSessionStudentRepository.remove(mm);
  }

  async add_note_to_session(
    student_id: number,
    session_id: number,
    note: {
      subject: string;
      tutor_plan: string[];
      event_summary: string[];
    },
  ): Promise<undefined | Error> {
    const mm = await this.mmSessionStudentRepository.findOne({
      where: {
        session: {
          id: session_id,
        },
        student: {
          id: student_id,
        },
      },
      relations: {
        session: true,
        student: true,
      },
    });

    if (!mm) return gen_error('Student is not in session');

    const webdata_id = `/session_notes/${mm.student.id}`;
    const notes = await this.webdataService
      .readSerdeFromFile(AnySessionNoteVersion, webdata_id)
      .then((v) => {
        if ('error' in v) {
          return { sessions: [] };
        }
        return v;
      });

    const index = notes.sessions.findIndex((v) => v.session_id == session_id);
    if (index == -1) {
      notes.sessions.push({
        session_id,
        session_date: mm.session.date,
        ...note,
      });
    } else {
      notes.sessions[index] = {
        session_id,
        session_date: mm.session.date,
        ...note,
      };
    }

    await this.webdataService.saveSerdeToFile(
      AnySessionNoteVersion,
      webdata_id,
      notes,
    );
  }

  async get_note_for_session(
    student_id: number,
    session_id: number,
  ): Promise<LatestSessionNoteFormat['sessions'][number] | undefined> {
    const webdata_id = `/session_notes/${student_id}`;

    const notes = await this.webdataService
      .readSerdeFromFile(AnySessionNoteVersion, webdata_id)
      .then((v) => ('error' in v ? [] : v.sessions));

    return notes.find((n) => n.session_id == session_id);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Student, MmSessionStudent]),
    StudentServiceModule,
    ClientServiceModule,
    WebDataServiceModule,
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionServiceModule {}
