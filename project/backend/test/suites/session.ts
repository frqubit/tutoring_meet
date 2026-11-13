import { setTimeout } from 'node:timers/promises';
import {
  gen_e2e_tests,
  Handlers,
  MS_IN,
  throw_server_error,
} from '../../src/utils/e2e_utils';
import { expect } from 'vitest';
import { SessionCompletion } from '@/src/entities/Session';

export const TESTS = gen_e2e_tests('SessionController', (gen) => {
  gen.test(
    'FindAll/Create/FindOne',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      await Testers.Session.FindAll({}, (val) => {
        expect(val).toHaveLength(0);
      });

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => val,
      );

      const student = await Testers.Student.Create(
        {
          body: {
            name: 'John Doe II',
            active: true,
            client_id: client.id,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          return val;
        },
      );

      const session_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const session = await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 60,
            date: session_date,
            ends: undefined,
            every: 0,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.completed).toEqual(SessionCompletion.NONE);
          expect(val.date).toEqual(session_date);
          expect(val.ends).toEqual(null);
          expect(val.every).toEqual(0);
          expect(val.index).toEqual(0);
          expect(val.minutes).toEqual(60);
          expect(val.students).toHaveLength(1);
          expect(val.students[0].id).toEqual(student.id);
          expect(val.students[0].name).toEqual(student.name);

          return val;
        },
      );

      await Testers.Session.FindOne({ params: { id: session.id } }, (val) => {
        expect(val?.date).toEqual(session_date);
        expect(val?.minutes).toEqual(session.minutes);
      });

      await Testers.Session.FindAll({}, (val) => {
        expect(val).toHaveLength(1);
      });
    },
    [
      Handlers.Session.FindAll,
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Session.FindOne,
    ],
  );

  gen.test(
    'Mass Remove',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => val,
      );

      const student = await Testers.Student.Create(
        {
          body: {
            name: 'John Doe II',
            active: true,
            client_id: client.id,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          return val;
        },
      );

      const all_sessions = Array.from({ length: 100 }).map((_v) => ({
        student_id: student.id,
        minutes: 60,
        date: new Date(
          Date.now() +
            24 * 60 * 60 * 1000 * (Math.floor(Math.random() * 24000) + 1 / 24),
        ),
        ends: undefined,
        every: 0,
      }));

      for (const session of all_sessions) {
        await Testers.Session.Create({ body: session }, (_val) => {});
      }

      const unique_ids = new Set<number>();
      while (unique_ids.size < 10) {
        const random_id = Math.floor(Math.random() * all_sessions.length);
        unique_ids.add(random_id);
      }

      for (const remove_id of unique_ids.values()) {
        await Testers.Session.Remove(
          { params: { id: remove_id } },
          (_val) => {},
        );
        await Testers.Session.FindOne(
          { params: { id: remove_id } },
          (_val) => {},
          { enforce: { status_code: 404 } },
        );
      }
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Session.FindOne,
      Handlers.Session.Remove,
    ],
  );

  gen.test(
    'Submit',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => val,
      );

      const student = await Testers.Student.Create(
        {
          body: {
            name: 'John Doe II',
            active: true,
            client_id: client.id,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          return val;
        },
      );

      const session = await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 60,
            date: new Date(Date.now() + 1000),
            ends: undefined,
            every: 0,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.completed).toEqual(SessionCompletion.NONE);

          return val;
        },
      );

      const session2 = await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 60,
            date: new Date(Date.now() + 1000),
            ends: undefined,
            every: 0,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.completed).toEqual(SessionCompletion.NONE);

          return val;
        },
      );

      const session3 = await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 60,
            date: new Date(Date.now() + 1000),
            ends: undefined,
            every: 0,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.completed).toEqual(SessionCompletion.NONE);

          return val;
        },
      );

      const pastSession = await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 60,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            ends: undefined,
            every: 0,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.completed).toEqual(SessionCompletion.COMPLETED);

          return val;
        },
      );

      const futureSession = await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 60,
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ends: undefined,
            every: 0,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.completed).toEqual(SessionCompletion.NONE);

          return val;
        },
      );

      await setTimeout(1100);

      await Testers.Session.Submit(
        { params: { id: session.id, variant: SessionCompletion.COMPLETED } },
        (val) => {
          if (val !== null) {
            throw new Error(`Error from server: ${val.message}`);
          }
        },
      );

      await Testers.Session.FindOne({ params: { id: session.id } }, (val) => {
        expect(val?.completed).toEqual(SessionCompletion.COMPLETED);
      });

      await Testers.Session.Submit(
        { params: { id: session2.id, variant: SessionCompletion.NOSHOW } },
        (val) => {
          if (val !== null) {
            throw new Error(`Error from server: ${val.message}`);
          }
        },
      );

      await Testers.Session.FindOne({ params: { id: session2.id } }, (val) => {
        expect(val?.completed).toEqual(SessionCompletion.NOSHOW);
      });

      await Testers.Session.Submit(
        { params: { id: session3.id, variant: SessionCompletion.LATECANCEL } },
        (val) => {
          if (val !== null) {
            throw new Error(`Error from server: ${val.message}`);
          }
        },
      );

      await Testers.Session.FindOne({ params: { id: session3.id } }, (val) => {
        expect(val?.completed).toEqual(SessionCompletion.LATECANCEL);
      });

      await Testers.Session.Submit(
        {
          params: { id: pastSession.id, variant: SessionCompletion.COMPLETED },
        },
        (val) => {
          if (val === null) {
            throw new Error(`Marking completed session complete should fail`);
          }
        },
      );

      await Testers.Session.Submit(
        {
          params: {
            id: futureSession.id,
            variant: SessionCompletion.COMPLETED,
          },
        },
        (val) => {
          if (val === null) {
            throw new Error(`Marking future session complete should fail`);
          }
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Session.Submit,
      Handlers.Session.FindOne,
    ],
  );

  gen.test(
    'FindAllCompleted/FutureOf',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const c1 = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => val,
      );

      const c2 = await Testers.Client.Create(
        {
          body: {
            name: 'Jane Doe',
            active: true,
          },
        },
        (val) => val,
      );

      const s1 = await Testers.Student.Create(
        {
          body: {
            client_id: c1.id,
            name: 'John Doe II',
            active: true,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const s2 = await Testers.Student.Create(
        {
          body: {
            client_id: c2.id,
            name: 'Jane Doe II',
            active: true,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const _ex_session_fn = async () => {
        return await Testers.Session.Create(
          {
            body: {
              date: new Date(),
              student_id: s1.id,
              minutes: 60,
              every: 0,
              ends: undefined,
            },
          },
          (val) => {
            if ('error' in val) throw_server_error(val);
            return val;
          },
        );
      };

      const sessions: Awaited<ReturnType<typeof _ex_session_fn>>[] = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date(
          Date.now() + Math.random() * (MS_IN.day * 100) - MS_IN.day * 50,
        ); // 50 days on either side
        const every =
          date.getTime() < Date.now() ? 0 : Math.floor(Math.random() * 3);
        const ends =
          every == 0
            ? undefined
            : new Date(
                date.getTime() +
                  MS_IN.week * every * (Math.floor(Math.random() * 5) + 2),
              );
        const student1 = Math.random() < 0.5;

        const session = await Testers.Session.Create(
          {
            body: {
              date,
              student_id: student1 ? s1.id : s2.id,
              minutes: (Math.floor(Math.random() * 4) + 1) * 30,
              every,
              ends,
            },
          },
          (val) => {
            if ('error' in val) throw_server_error(val);

            return val;
          },
        );

        if (Math.random() < 0.5) {
          sessions.push(session);
          continue;
        }

        await Testers.Session.AddStudentToSession(
          {
            params: {
              sessionId: session.id,
              studentId: student1 ? s2.id : s1.id,
            },
          },
          (val) => {
            if (val !== null) throw_server_error(val);
          },
        );

        session.students.push(student1 ? s2 : s1);

        sessions.push(session);
      }

      const s1_sessions = sessions.filter(
        (v) => v.students.findIndex((s) => s.id == s1.id) != -1,
      );
      const s2_sessions = sessions.filter(
        (v) => v.students.findIndex((s) => s.id == s2.id) != -1,
      );

      const s1_completed = s1_sessions.filter(
        (v) => v.completed == SessionCompletion.COMPLETED,
      );
      const s1_future = s1_sessions.filter(
        (v) => v.completed == SessionCompletion.NONE,
      );

      const s2_completed = s2_sessions.filter(
        (v) => v.completed == SessionCompletion.COMPLETED,
      );
      const s2_future = s2_sessions.filter(
        (v) => v.completed == SessionCompletion.NONE,
      );

      s1_sessions.sort((a, b) => a.id - b.id);
      s2_sessions.sort((a, b) => a.id - b.id);

      s1_completed.sort((a, b) => a.id - b.id);
      s1_future.sort((a, b) => a.id - b.id);
      s2_completed.sort((a, b) => a.id - b.id);
      s2_future.sort((a, b) => a.id - b.id);

      const s1_completed_res = await Testers.Student.FindAllCompletedSessionsOf(
        { params: { id: s1.id } },
        (val) => {
          expect(val).toHaveLength(s1_completed.length);
          const val_sorted = val.toSorted((a, b) => a.id - b.id);
          val_sorted.map((s, i) => expect(s.id).toEqual(s1_completed[i].id));
          return val_sorted;
        },
      );

      const s2_completed_res = await Testers.Student.FindAllCompletedSessionsOf(
        { params: { id: s2.id } },
        (val) => {
          expect(val).toHaveLength(s2_completed.length);
          const val_sorted = val.toSorted((a, b) => a.id - b.id);
          val_sorted.map((s, i) => expect(s.id).toEqual(s2_completed[i].id));
          return val_sorted;
        },
      );

      const s1_future_res = await Testers.Student.FindAllFutureSessionsOf(
        { params: { id: s1.id } },
        (val) => {
          expect(val).toHaveLength(s1_future.length);
          const val_sorted = val.toSorted((a, b) => a.id - b.id);
          val_sorted.map((s, i) => expect(s.id).toEqual(s1_future[i].id));
          return val_sorted;
        },
      );

      const s2_future_res = await Testers.Student.FindAllFutureSessionsOf(
        { params: { id: s2.id } },
        (val) => {
          expect(val).toHaveLength(s2_future.length);
          const val_sorted = val.toSorted((a, b) => a.id - b.id);
          val_sorted.map((s, i) => expect(s.id).toEqual(s2_future[i].id));
          return val_sorted;
        },
      );

      await Testers.Client.FindAllCompletedSessionsOf(
        { params: { id: c1.id } },
        (val) => {
          expect(val).toHaveLength(s1_completed_res.length);
          val
            .toSorted((a, b) => a.id - b.id)
            .map((s, i) => expect(s.id).toEqual(s1_completed_res[i].id));
        },
      );

      await Testers.Client.FindAllCompletedSessionsOf(
        { params: { id: c2.id } },
        (val) => {
          expect(val).toHaveLength(s2_completed_res.length);
          val
            .toSorted((a, b) => a.id - b.id)
            .map((s, i) => expect(s.id).toEqual(s2_completed_res[i].id));
        },
      );

      await Testers.Client.FindAllFutureSessionsOf(
        { params: { id: c1.id } },
        (val) => {
          expect(val).toHaveLength(s1_future_res.length);
          val
            .toSorted((a, b) => a.id - b.id)
            .map((s, i) => expect(s.id).toEqual(s1_future_res[i].id));
        },
      );

      await Testers.Client.FindAllFutureSessionsOf(
        { params: { id: c2.id } },
        (val) => {
          expect(val).toHaveLength(s2_future_res.length);
          val
            .toSorted((a, b) => a.id - b.id)
            .map((s, i) => expect(s.id).toEqual(s2_future_res[i].id));
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Session.AddStudentToSession,
      Handlers.Student.FindAllCompletedSessionsOf,
      Handlers.Student.FindAllFutureSessionsOf,
      Handlers.Client.FindAllCompletedSessionsOf,
      Handlers.Client.FindAllFutureSessionsOf,
    ],
  );

  gen.test(
    'Reschedule/Filter etc',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => val,
      );

      const student1 = await Testers.Student.Create(
        {
          body: {
            name: 'John Doe II',
            active: true,
            client_id: client.id,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const student2 = await Testers.Student.Create(
        {
          body: {
            name: 'Jane Doe II',
            active: true,
            client_id: client.id,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const now_date = new Date();
      const session1_date = new Date(Date.now() + MS_IN.day * 5);
      const session1 = await Testers.Session.Create(
        {
          body: {
            student_id: student1.id,
            date: session1_date,
            every: 1,
            ends: new Date(session1_date.getTime() + MS_IN.week * 3),
            minutes: 60,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const session2_date = new Date(Date.now() + MS_IN.day * 6);
      const session2 = await Testers.Session.Create(
        {
          body: {
            student_id: student1.id,
            date: session2_date,
            every: 2,
            ends: new Date(session2_date.getTime() + MS_IN.week * 5),
            minutes: 30,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const session_past1_date = new Date(Date.now() - MS_IN.day * 3);
      const session_past1 = await Testers.Session.Create(
        {
          body: {
            student_id: student1.id,
            date: session_past1_date,
            every: 1,
            ends: new Date(session_past1_date.getTime() + MS_IN.week * 3),
            minutes: 60,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      // date, minutes
      const s1_future_dates: [Date, number][] = [
        [new Date(session_past1_date.getTime() + MS_IN.week), 60],
        [session1_date, 60],
        [session2_date, 30],
        [new Date(session_past1_date.getTime() + MS_IN.week * 2), 60],
        [new Date(session1_date.getTime() + MS_IN.week), 60],
        [new Date(session_past1_date.getTime() + MS_IN.week * 3), 60],
        [new Date(session1_date.getTime() + MS_IN.week * 2), 60],
        [new Date(session2_date.getTime() + MS_IN.week * 2), 30],
        [new Date(session1_date.getTime() + MS_IN.week * 3), 60],
        [new Date(session2_date.getTime() + MS_IN.week * 4), 30],
      ];

      await Testers.Session.FindAllUpcoming({}, (val) => {
        expect(val).toHaveLength(s1_future_dates.length);
        val.forEach((s, i) => {
          expect(s.date).toEqual(s1_future_dates[i][0]);
          expect(s.minutes).toEqual(s1_future_dates[i][1]);
        });
      });

      const session3_date = new Date(Date.now() + MS_IN.day * 3);
      const session3 = await Testers.Session.Create(
        {
          body: {
            student_id: student2.id,
            date: session3_date,
            every: 1,
            ends: new Date(session3_date.getTime() + MS_IN.week * 9),
            minutes: 60,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const session_past2_date = new Date(Date.now() - MS_IN.day * 5);
      const session_past2 = await Testers.Session.Create(
        {
          body: {
            student_id: student2.id,
            date: session_past1_date,
            every: 0,
            ends: undefined,
            minutes: 60,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      // date, minutes
      let s2_future_dates: [Date, number][] = [
        [session3_date, 60],
        [new Date(session3_date.getTime() + MS_IN.week), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 2), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 3), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 4), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 5), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 6), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 7), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 8), 60],
        [new Date(session3_date.getTime() + MS_IN.week * 9), 60],
      ];

      await Testers.Session.FindAllByFilter(
        {
          body: {
            start: now_date,
            student_id: student2.id,
            completed: false,
            end: undefined,
            client_id: undefined,
            max_count: undefined,
          },
        },
        (val) => {
          expect(val).toHaveLength(s2_future_dates.length);
          val.forEach((s, i) => {
            expect(s.date).toEqual(s2_future_dates[i][0]);
            expect(s.minutes).toEqual(s2_future_dates[i][1]);
          });
        },
      );

      // Remove the first one
      s2_future_dates = s2_future_dates.filter((v, i) => i != 0);
      await Testers.Session.RemoveOneInSeries(
        {
          params: {
            id: session3.id,
            index: 0,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      const session3_first_newid = await Testers.Session.FindAllByFilter(
        {
          body: {
            start: now_date,
            student_id: student2.id,
            completed: false,
            end: undefined,
            client_id: undefined,
            max_count: undefined,
          },
        },
        (val) => {
          expect(val).toHaveLength(s2_future_dates.length);
          val.forEach((s, i) => {
            expect(s.date).toEqual(s2_future_dates[i][0]);
            expect(s.minutes).toEqual(s2_future_dates[i][1]);
          });

          return val[0].id;
        },
      );

      // Remove the now second one
      s2_future_dates = s2_future_dates.filter((v, i) => i != 1);
      await Testers.Session.RemoveOneInSeries(
        {
          params: {
            id: session3_first_newid,
            index: 1,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      const sessions3_second_newid = await Testers.Session.FindAllByFilter(
        {
          body: {
            start: now_date,
            student_id: student2.id,
            completed: false,
            end: undefined,
            client_id: undefined,
            max_count: undefined,
          },
        },
        (val) => {
          expect(val).toHaveLength(s2_future_dates.length);
          val.forEach((s, i) => {
            expect(s.date).toEqual(s2_future_dates[i][0]);
            expect(s.minutes).toEqual(s2_future_dates[i][1]);
          });

          return val[1].id;
        },
      );

      // Fail to remove one after the first date
      await Testers.Session.RemoveOneInSeries(
        {
          params: {
            id: session3_first_newid,
            index: 2,
          },
        },
        (val) => {
          if (val === null)
            throw new Error('should have failed, session does not repeat');
        },
      );

      const future_of = s2_future_dates.filter((_, i) => i > 0);
      await Testers.Session.FindFutureDatesOf(
        {
          params: { id: sessions3_second_newid },
        },
        (val) => {
          expect(val).toHaveLength(future_of.length);
          val.forEach((s, i) => {
            expect(s.date).toEqual(future_of[i][0]);
            expect(s.minutes).toEqual(future_of[i][1]);
          });
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Session.FindAllByFilter,
      Handlers.Session.FindAllUpcoming,
      Handlers.Session.RemoveOneInSeries,
      Handlers.Session.FindFutureDatesOf,
    ],
  );

  gen.test(
    'Modify',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => val,
      );

      const student1 = await Testers.Student.Create(
        {
          body: {
            name: 'John Doe II',
            active: true,
            client_id: client.id,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const student2 = await Testers.Student.Create(
        {
          body: {
            name: 'Jane Doe II',
            active: true,
            client_id: client.id,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const session_date = new Date(Date.now() + MS_IN.day * 5);
      const session = await Testers.Session.Create(
        {
          body: {
            student_id: student1.id,
            date: session_date,
            every: 1,
            ends: new Date(session_date.getTime() + MS_IN.week * 7),
            minutes: 60,
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      await Testers.Session.AddStudentToSession(
        {
          params: {
            studentId: student2.id,
            sessionId: session.id,
          },
        },
        (_val) => {},
      );

      await Testers.Session.FindOne(
        {
          params: { id: session.id },
        },
        (val) => {
          expect(val?.students).toHaveLength(2);
        },
      );

      await Testers.Session.RemoveStudentFromSession(
        {
          params: {
            studentId: student1.id,
            sessionId: session.id,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      await Testers.Session.RemoveStudentFromSession(
        {
          params: {
            studentId: student2.id,
            sessionId: session.id,
          },
        },
        (val) => {
          if (val === null)
            throw new Error('should have failed, cannot remove last student');
        },
      );

      await Testers.Session.FindOne(
        {
          params: {
            id: session.id,
          },
        },
        (val) => {
          expect(val?.students).toHaveLength(1);
          expect(val?.students[0].id).toEqual(student2.id);
        },
      );

      await Testers.Session.Reschedule(
        {
          params: {
            id: session.id,
            index: 0,
          },
          body: {
            date: session.date,
            minutes: 30,
            all: true,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      let first_id = await Testers.Session.FindAllByFilter(
        {
          body: {
            student_id: student2.id,
            start: session.date,
            client_id: undefined,
            end: undefined,
            completed: undefined,
            max_count: undefined,
          },
        },
        (val) => {
          expect(val[0].minutes).toEqual(30);
          expect(val[1].minutes).toEqual(30);
          return val[0].id;
        },
      );

      await Testers.Session.Reschedule(
        {
          params: {
            id: first_id,
            index: 0,
          },
          body: {
            date: new Date(session.date.getTime() + MS_IN.day),
            minutes: 30,
            all: true,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      first_id = await Testers.Session.FindAllByFilter(
        {
          body: {
            student_id: student2.id,
            start: session.date,
            client_id: undefined,
            end: undefined,
            completed: undefined,
            max_count: undefined,
          },
        },
        (val) => {
          expect(val[0].date).toEqual(
            new Date(session.date.getTime() + MS_IN.day),
          );
          expect(val[1].date).toEqual(
            new Date(session.date.getTime() + MS_IN.day + MS_IN.week),
          );
          return val[0].id;
        },
      );

      await Testers.Session.Reschedule(
        {
          params: {
            id: first_id,
            index: 2,
          },
          body: {
            date: new Date(session.date.getTime() + MS_IN.day + MS_IN.week * 2),
            minutes: 60,
            all: true,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      await Testers.Session.FindAllByFilter(
        {
          body: {
            student_id: student2.id,
            start: session.date,
            client_id: undefined,
            end: undefined,
            completed: undefined,
            max_count: undefined,
          },
        },
        (val) => {
          expect(val[0].minutes).toEqual(30);
          expect(val[1].minutes).toEqual(30);

          expect(val[2].date).toEqual(
            new Date(session.date.getTime() + MS_IN.day + MS_IN.week * 2),
          );
          expect(val[2].minutes).toEqual(60);

          expect(val[3].date).toEqual(
            new Date(session.date.getTime() + MS_IN.day + MS_IN.week * 3),
          );
          expect(val[3].minutes).toEqual(60);
        },
      );

      await Testers.Session.Reschedule(
        {
          params: {
            id: first_id,
            index: 0,
          },
          body: {
            date: new Date(session.date.getTime() + MS_IN.day),
            minutes: 60,
            all: false,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      first_id = await Testers.Session.FindAllByFilter(
        {
          body: {
            student_id: student2.id,
            start: session.date,
            client_id: undefined,
            end: undefined,
            completed: undefined,
            max_count: undefined,
          },
        },
        (val) => {
          expect(val[0].minutes).toEqual(60);
          expect(val[1].minutes).toEqual(30);

          return val[0].id;
        },
      );

      await Testers.Session.Reschedule(
        {
          params: {
            id: first_id,
            index: 3,
          },
          body: {
            date: new Date(session.date.getTime() + MS_IN.day + MS_IN.week * 3),
            minutes: 60,
            all: false,
          },
        },
        (val) => {
          if (val === null) throw new Error('should fail, index out of range!');
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Session.AddStudentToSession,
      Handlers.Session.RemoveStudentFromSession,
      Handlers.Session.Reschedule,
      Handlers.Session.FindAllByFilter,
      Handlers.Session.FindOne,
    ],
  );
});
