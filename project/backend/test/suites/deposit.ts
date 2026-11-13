import {
  gen_e2e_tests,
  Handlers,
  MS_IN,
  throw_server_error,
} from '../../src/utils/e2e_utils';
import { expect } from 'vitest';

export const TESTS = gen_e2e_tests('DepositController', (gen) => {
  gen.test(
    'FindAll/Create/FindOne/Remove',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      await Testers.Deposit.FindAll({}, (val) => {
        expect(val).toHaveLength(0);
      });

      const client = await Testers.Client.Create(
        {
          body: {
            name: 'John Doe',
            active: true,
          },
        },
        (val) => {
          return val;
        },
      );

      const inactiveClient = await Testers.Client.Create(
        {
          body: {
            name: 'Jane Doe',
            active: false,
          },
        },
        (val) => {
          return val;
        },
      );

      const deposit_date = new Date();
      const deposit = await Testers.Deposit.Create(
        {
          body: {
            client_id: client.id,
            cents: 5000,
            date: deposit_date,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.cents).toEqual(5000);
          expect(val.date).toEqual(deposit_date);
          expect(val.client.name).toEqual(client.name);

          return val;
        },
      );

      await Testers.Deposit.Create(
        {
          body: {
            client_id: inactiveClient.id,
            cents: 5000,
            date: deposit_date,
          },
        },
        (val) => {
          expect('error' in val).toBe(true);
        },
      );

      await Testers.Deposit.FindOne({ params: { id: deposit.id } }, (val) => {
        expect(val?.client.name).toEqual(client.name);
      });

      await Testers.Deposit.FindAll({}, (val) => {
        expect(val).toHaveLength(1);
      });

      await Testers.Deposit.FindOne(
        { params: { id: deposit.id + 1 } },
        (_val) => {},
        { enforce: { status_code: 404 } },
      );

      await Testers.Deposit.Remove(
        { params: { id: deposit.id } },
        (_val) => {},
      );

      await Testers.Deposit.FindAll({}, (val) => {
        expect(val).toHaveLength(0);
      });
    },
    [
      Handlers.Deposit.Create,
      Handlers.Client.Create,
      Handlers.Deposit.FindAll,
      Handlers.Deposit.FindOne,
      Handlers.Deposit.Remove,
    ],
  );

  gen.test(
    'GetBalanceOf',
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
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      const deposit = await Testers.Deposit.Create(
        {
          body: {
            client_id: client.id,
            date: new Date(),
            cents: 10500, // $105.00
          },
        },
        (val) => {
          if ('error' in val) throw_server_error(val);

          return val;
        },
      );

      await Testers.Client.GetBalanceOf(
        {
          params: { id: client.id },
        },
        (val) => {
          expect(val).toEqual(10500);
        },
      );

      await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 60,
            every: 0,
            ends: undefined,
            date: new Date(Date.now() - MS_IN.day * 2),
          },
        },
        (_val) => {},
      );

      await Testers.Client.GetBalanceOf(
        {
          params: { id: client.id },
        },
        (val) => {
          expect(val).toEqual(7000);
        },
      );

      await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 30,
            every: 1,
            ends: new Date(Date.now() + MS_IN.week * 5),
            date: new Date(Date.now() - MS_IN.day * 3),
          },
        },
        (_val) => {},
      );

      await Testers.Client.GetBalanceOf(
        {
          params: { id: client.id },
        },
        (val) => {
          expect(val).toEqual(5250);
        },
      );

      await Testers.Session.Create(
        {
          body: {
            student_id: student.id,
            minutes: 30,
            every: 0,
            ends: undefined,
            date: new Date(Date.now() + MS_IN.day * 6),
          },
        },
        (_val) => {},
      );

      await Testers.Client.GetBalanceOf(
        {
          params: { id: client.id },
        },
        (val) => {
          expect(val).toEqual(5250);
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Deposit.Create,
      Handlers.Student.Create,
      Handlers.Session.Create,
      Handlers.Client.GetBalanceOf,
    ],
  );
});
