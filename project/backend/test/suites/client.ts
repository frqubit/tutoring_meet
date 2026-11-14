import {
  gen_e2e_tests,
  Handlers,
  MS_IN,
  throw_server_error,
} from '../../src/utils/e2e_utils';
import { expect } from 'vitest';
import dayjs from 'dayjs';
import { C_MYSELF } from '@/src/utils/constants';

export const TESTS = gen_e2e_tests('ClientController', (gen) => {
  gen.test(
    'FindAll/Create/FindOne',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      await Testers.Client.FindAll({}, (res) => {
        expect(res).toHaveLength(0);
      });

      const john = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (res) => {
          expect(res.id).toEqual(1);
          expect(res.name).toEqual('John Doe');
          expect(res.active).toEqual(true);

          return res;
        },
      );

      await Testers.Client.FindOne({ params: { id: john.id } }, (res) => {
        expect(res?.name).toEqual('John Doe');
      });
    },
    [Handlers.Client.FindAll, Handlers.Client.FindOne, Handlers.Client.Create],
  );

  gen.test(
    'Mass Create/ToggleActive/Remove',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const new_clients: {
        name: string;
        active: boolean;
      }[] = Array.from({ length: 100 }).map(() => ({
        name: Math.random().toString(36).substring(2, 13),
        active: Math.random() > 0.5,
      }));
      for (const client of new_clients) {
        // This was tested in the previous suite
        await Testers.Client.Create({ body: client }, (_res) => {});
      }

      const all_fetched_clients = await Testers.Client.FindAll({}, (res) => {
        expect(res.length).toEqual(new_clients.length);
        for (let i = 0; i < res.length; i++) {
          expect(res[i].name).toEqual(new_clients[i].name);
          expect(res[i].active).toEqual(new_clients[i].active);
        }

        return res;
      });

      for (const client of all_fetched_clients) {
        await Testers.Client.ToggleActive(
          { params: { id: client.id } },
          (res) => {
            expect(res).not.toBeNull();
            expect(res!.active).toBe(!client.active);
          },
        );
      }

      const random_ids: number[] = Array.from({ length: 10 }).reduce(
        (agg: number[], _next: undefined) => {
          let random_number = Math.floor(
            Math.random() * all_fetched_clients.length,
          );

          while (random_number in agg) {
            random_number = Math.floor(
              Math.random() * all_fetched_clients.length,
            );
          }

          agg.push(random_number);
          return agg;
        },
        [] as number[],
      ) as number[];

      for (const id of random_ids) {
        await Testers.Client.Remove({ params: { id } }, (_res) => {});
        await Testers.Client.FindOne({ params: { id } }, (_res) => {}, {
          enforce: { status_code: 404 },
        });
      }
    },
    [
      Handlers.Client.Create,
      Handlers.Client.FindAll,
      Handlers.Client.FindOne,
      Handlers.Client.Remove,
      Handlers.Client.ToggleActive,
    ],
  );

  gen.test(
    'Rename',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => {
          expect(val.name).toEqual('John Doe');
          return val;
        },
      );

      await Testers.Client.Rename(
        {
          params: { id: client.id },
          body: 'Jane Doe',
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          expect(val.name).toEqual('Jane Doe');
        },
      );

      await Testers.Client.ToggleActive(
        { params: { id: client.id } },
        (val) => {
          expect(val?.active).toEqual(false);
        },
      );

      await Testers.Client.Rename(
        {
          params: { id: client.id },
          body: 'John Doe',
        },
        (val) => {
          expect('error' in val).toBe(true);
        },
      );

      await Testers.Client.FindOne({ params: { id: client.id } }, (val) => {
        expect(val?.name).toEqual('Jane Doe');
      });
    },
    [
      Handlers.Client.Create,
      Handlers.Client.Rename,
      Handlers.Client.FindOne,
      Handlers.Client.ToggleActive,
    ],
  );

  gen.test(
    'MergeInto',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client_a = await Testers.Client.Create(
        {
          body: {
            name: 'a',
            active: true,
          },
        },
        (res) => res,
      );

      const client_b = await Testers.Client.Create(
        {
          body: {
            name: 'a',
            active: true,
          },
        },
        (res) => res,
      );

      const client_a_inactive = await Testers.Client.Create(
        {
          body: {
            name: 'a inactive',
            active: false,
          },
        },
        (res) => res,
      );

      const client_c = await Testers.Client.Create(
        {
          body: {
            name: 'c',
            active: true,
          },
        },
        (res) => res,
      );

      const deposits_a = await Promise.all(
        Array.from({ length: 10 }).map(async (_) => {
          return await Testers.Deposit.Create(
            {
              body: {
                date: new Date(),
                cents: 1000, // $10
                client_id: client_a.id,
              },
            },
            (val) => {
              if ('error' in val) throw_server_error(val);

              return val;
            },
          );
        }),
      );

      const students_a = await Promise.all(
        Array.from({ length: 10 }).map(async (_) => {
          return await Testers.Student.Create(
            {
              body: {
                client_id: client_a.id,
                name: Math.random().toString(36).substring(2, 13),
                active: Math.random() < 0.5,
              },
            },
            (val) => {
              if ('error' in val) throw_server_error(val);

              return val;
            },
          );
        }),
      );

      const deposits_b = await Promise.all(
        Array.from({ length: 10 }).map(async (_) => {
          return await Testers.Deposit.Create(
            {
              body: {
                date: new Date(),
                cents: 1000, // $10
                client_id: client_b.id,
              },
            },
            (val) => {
              if ('error' in val) throw_server_error(val);

              return val;
            },
          );
        }),
      );

      const students_b = await Promise.all(
        Array.from({ length: 10 }).map(async (_) => {
          return await Testers.Student.Create(
            {
              body: {
                client_id: client_b.id,
                name: Math.random().toString(36).substring(2, 13),
                active: Math.random() < 0.5,
              },
            },
            (val) => {
              if ('error' in val) throw_server_error(val);

              return val;
            },
          );
        }),
      );

      const deposits_c = await Promise.all(
        Array.from({ length: 10 }).map(async (_) => {
          return await Testers.Deposit.Create(
            {
              body: {
                date: new Date(),
                cents: 1000, // $10
                client_id: client_c.id,
              },
            },
            (val) => {
              if ('error' in val) throw_server_error(val);

              return val;
            },
          );
        }),
      );

      const students_c = await Promise.all(
        Array.from({ length: 10 }).map(async (_) => {
          return await Testers.Student.Create(
            {
              body: {
                client_id: client_c.id,
                name: Math.random().toString(36).substring(2, 13),
                active: Math.random() < 0.5,
              },
            },
            (val) => {
              if ('error' in val) throw_server_error(val);

              return val;
            },
          );
        }),
      );

      await Testers.Client.MergeInto(
        {
          params: {
            source: client_a_inactive.id,
            target: client_b.id,
          },
        },
        (val) => {
          if (val === null)
            throw new Error('Should have failed, source cannot be inactive');
        },
      );

      await Testers.Client.MergeInto(
        {
          params: {
            source: client_b.id,
            target: client_a_inactive.id,
          },
        },
        (val) => {
          if (val === null)
            throw new Error('Should have failed, target cannot be inactive');
        },
      );

      await Testers.Client.MergeInto(
        {
          params: {
            source: client_a.id,
            target: client_a.id,
          },
        },
        (val) => {
          if (val === null)
            throw new Error('Should have failed, clients cannot be the same');
        },
      );

      await Testers.Client.MergeInto(
        {
          params: {
            source: client_a.id,
            target: client_b.id,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      const ab_deposits = [...deposits_a, ...deposits_b].toSorted(
        (a, b) => a.id - b.id,
      );
      const ab_students = [...students_a, ...students_b].toSorted(
        (a, b) => a.id - b.id,
      );

      await Testers.Client.FindOne({ params: { id: client_a.id } }, (_) => {}, {
        enforce: { status_code: 404 },
      });

      await Testers.Client.FindAllDepositsOf(
        { params: { id: client_b.id } },
        (val) => {
          const sorted = val.toSorted((a, b) => a.id - b.id);
          expect(sorted).toHaveLength(ab_deposits.length);
          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i].date).toEqual(ab_deposits[i].date);
            expect(sorted[i].id).toEqual(ab_deposits[i].id);
          }
        },
      );

      await Testers.Student.FindAll({}, (val) => {
        const b = val
          .filter((v) => v.client.id == client_b.id)
          .toSorted((a, b) => a.id - b.id);
        expect(b).toHaveLength(ab_students.length);
        for (let i = 0; i < b.length; i++) {
          expect(b[i].name).toEqual(ab_students[i].name);
          expect(b[i].id).toEqual(ab_students[i].id);
        }
      });

      await Testers.Client.MergeInto(
        {
          params: {
            source: client_b.id,
            target: client_c.id,
          },
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      const abc_deposits = [
        ...deposits_a,
        ...deposits_b,
        ...deposits_c,
      ].toSorted((a, b) => a.id - b.id);
      const abc_students = [
        ...students_a,
        ...students_b,
        ...students_c,
      ].toSorted((a, b) => a.id - b.id);

      await Testers.Client.FindOne({ params: { id: client_b.id } }, (_) => {}, {
        enforce: { status_code: 404 },
      });

      await Testers.Client.FindAllDepositsOf(
        { params: { id: client_c.id } },
        (val) => {
          const sorted = val.toSorted((a, b) => a.id - b.id);
          expect(sorted).toHaveLength(abc_deposits.length);
          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i].date).toEqual(abc_deposits[i].date);
            expect(sorted[i].id).toEqual(abc_deposits[i].id);
          }
        },
      );

      await Testers.Student.FindAll({}, (val) => {
        const b = val
          .filter((v) => v.client.id == client_c.id)
          .toSorted((a, b) => a.id - b.id);
        expect(b).toHaveLength(abc_students.length);
        for (let i = 0; i < b.length; i++) {
          expect(b[i].name).toEqual(abc_students[i].name);
          expect(b[i].id).toEqual(abc_students[i].id);
        }
      });

      await Testers.Client.FindOne({ params: { id: client_c.id } }, (val) => {
        expect(val?.name).toEqual(client_c.name);
      });
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Deposit.Create,
      Handlers.Student.FindAll,
      Handlers.Client.FindOne,
      Handlers.Client.MergeInto,
      Handlers.Client.FindAllDepositsOf,
    ],
  );

  gen.test(
    'Next Invoice',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (v) => v,
      );

      const student = await Testers.Student.Create(
        {
          body: {
            client_id: client.id,
            name: 'John Doe II',
            active: true,
          },
        },
        (v) => {
          if ('error' in v) throw_server_error(v);

          return v;
        },
      );

      const start_of_this_month = dayjs().set('date', 1);
      const start_of_last_month = start_of_this_month.subtract(1, 'month');
      const start_of_next_month = start_of_this_month.add(1, 'month');
      const end_of_next_month = start_of_next_month
        .add(1, 'month')
        .subtract(2, 'day');

      await Testers.Client.GetNextInvoiceOf(
        {
          params: { id: client.id },
        },
        (v) => {
          if (v === null) throw new Error(`Invoice should exist but be empty`);

          expect(v.charges).toHaveLength(0);
        },
      );

      const session = await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            date: start_of_next_month.add(3, 'day').toDate(), // the 4th
            minutes: 60,
            ends: end_of_next_month.toDate(),
            every: 1, // 4 11 18 25
          },
        },
        (v) => {
          if ('error' in v) throw_server_error(v);

          return v;
        },
      );

      await Testers.Client.GetNextInvoiceOf(
        {
          params: { id: client.id },
        },
        (v) => {
          if (v === null) throw new Error('Invoice should exist');
          const total = v.charges.reduce((agg, next) => agg + next.cents, 0);

          expect(total).toEqual(14000); // $35 * 0
        },
      );

      await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            date: start_of_last_month.add(3, 'day').toDate(), // the 4th of last month
            minutes: 60,
            ends: undefined,
            every: 0,
          },
        },
        (v) => {
          if ('error' in v) throw_server_error(v);

          return v;
        },
      );

      await Testers.Client.GetNextInvoiceOf(
        {
          params: { id: client.id },
        },
        (v) => {
          if (v === null) throw new Error('Invoice should exist');
          const total = v.charges.reduce((agg, next) => agg + next.cents, 0);

          expect(total).toEqual(17500); // $35 * 5
        },
      );

      await Testers.Deposit.Create(
        {
          body: {
            client_id: client.id,
            cents: 3500,
            date: start_of_this_month.add(2, 'day').toDate(),
          },
        },
        (v) => {
          if ('error' in v) throw_server_error(v);
        },
      );

      await Testers.Client.GetNextInvoiceOf(
        {
          params: { id: client.id },
        },
        (v) => {
          if (v === null) throw new Error('Invoice should exist');
          const total = v.charges.reduce((agg, next) => agg + next.cents, 0);

          expect(total).toEqual(14000); // $35 * 4
        },
      );

      await Testers.Deposit.Create(
        {
          body: {
            client_id: client.id,
            cents: 3500 * 3,
            date: start_of_next_month.add(2, 'day').toDate(),
          },
        },
        (v) => {
          if ('error' in v) throw_server_error(v);
        },
      );

      await Testers.Client.GetNextInvoiceOf(
        {
          params: { id: client.id },
        },
        (v) => {
          if (v === null) throw new Error('Invoice should exist');
          const total = v.charges.reduce((agg, next) => agg + next.cents, 0);

          expect(total).toEqual(3500); // $35 * 1
        },
      );

      await Testers.Session.Remove({ params: { id: session.id } }, (v) => {
        if (v !== null) throw_server_error(v);
      });

      // Testing C_MYSELF
      await Utils.BecomeClient(client.id);

      await Testers.Client.GetNextInvoiceOf(
        {
          params: { id: C_MYSELF },
        },
        (v) => {
          if (v === null) throw new Error('Invoice should exist');
          const total = v.charges.reduce((agg, next) => agg + next.cents, 0);

          expect(total).toEqual(-10500); // $35 * -3
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Deposit.Create,
      Handlers.Session.Remove,
      Handlers.Client.GetNextInvoiceOf,
    ],
  );

  gen.test(
    'Find Recent Completed',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (v) => v,
      );

      const student = await Testers.Student.Create(
        {
          body: {
            client_id: client.id,
            name: 'John Doe II',
            active: true,
          },
        },
        (v) => {
          if ('error' in v) throw_server_error(v);

          return v;
        },
      );

      const yesterday = dayjs().subtract(1, 'day');

      const sessions = Array.from({ length: 15 }).map((_, i) => ({
        student_id: student.id,
        date: yesterday.subtract(i, 'day').toDate(),
        minutes: 60,
        ends: undefined,
        every: 0,
      }));

      for (const session_obj of sessions) {
        const session = await Testers.Session.Create(
          { body: session_obj },
          (v) => {
            if ('error' in v) throw_server_error(v);

            return v;
          },
        );
      }

      await Testers.Client.FindRecentCompletedSessionsOf(
        {
          params: { id: client.id },
        },
        (v) => {
          expect(v).toHaveLength(10);
          v.forEach((v2, i) => {
            // Offset from the 10th
            expect(v2.date).toEqual(sessions[9 - i].date);
          });
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Client.FindRecentCompletedSessionsOf,
    ],
  );
});
