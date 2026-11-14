import {
  gen_e2e_tests,
  Handlers,
  throw_server_error,
} from '../../src/utils/e2e_utils';
import { expect } from 'vitest';

export const TESTS = gen_e2e_tests('StudentController', (gen) => {
  gen.test(
    'FindAll/Create/FindOne/Remove',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      await Testers.Student.FindAll({}, (val) => {
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

      const student = await Testers.Student.Create(
        {
          body: {
            client_id: client.id,
            name: 'John Doe II',
            active: true,
          },
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val.name).toEqual('John Doe II');
          expect(val.active).toEqual(true);
          expect(val.client.name).toEqual(client.name);

          return val;
        },
      );

      await Testers.Student.Create(
        {
          body: {
            client_id: inactiveClient.id,
            name: 'John Doe II',
            active: true,
          },
        },
        (val) => {
          expect('error' in val).toBe(true);
        },
      );

      await Testers.Student.FindOne({ params: { id: student.id } }, (val) => {
        expect(val?.client.name).toEqual(client.name);
      });

      await Testers.Student.FindAll({}, (val) => {
        expect(val).toHaveLength(1);
      });

      await Testers.Student.FindOne(
        { params: { id: student.id + 1 } },
        (_val) => {},
        { enforce: { status_code: 404 } },
      );

      await Testers.Student.Remove(
        { params: { id: student.id } },
        (_val) => {},
      );

      await Testers.Student.FindAll({}, (val) => {
        expect(val).toHaveLength(0);
      });
    },
    [
      Handlers.Student.FindAll,
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Student.FindOne,
      Handlers.Student.Remove,
    ],
  );

  gen.test(
    'Mass Create/ToggleActive/Remove',
    async (Testers, { Utils }) => {
      await Utils.BecomeAdministrator();

      const client1 = await Testers.Client.Create(
        {
          body: { name: 'John Doe', active: true },
        },
        (val) => val,
      );

      const client2 = await Testers.Client.Create(
        {
          body: { name: 'John Doe', active: true },
        },
        (val) => val,
      );

      const new_students = Array.from({ length: 100 }).map(() => ({
        client_id: Math.random() > 0.5 ? client1.id : client2.id,
        name: Math.random().toString(36).substring(2, 13),
        active: Math.random() > 0.5,
      }));

      const _ex_createdstudent_fn = async () => {
        return await Testers.Student.Create(
          {
            body: new_students[0],
          },
          (val) => {
            if ('error' in val) throw_server_error(val);
            return val;
          },
        );
      };

      let students1: Awaited<ReturnType<typeof _ex_createdstudent_fn>>[] = [];
      let students2: Awaited<ReturnType<typeof _ex_createdstudent_fn>>[] = [];

      for (const student of new_students) {
        // This was tested in the previous suite
        const student_obj = await Testers.Student.Create(
          { body: student },
          (res) => {
            if ('error' in res) throw_server_error(res);

            return res;
          },
        );

        if (student_obj.client.id == client1.id) {
          students1.push(student_obj);
        } else {
          students2.push(student_obj);
        }
      }

      const all_fetched_students = await Testers.Student.FindAll({}, (res) => {
        expect(res.length).toEqual(new_students.length);
        for (let i = 0; i < res.length; i++) {
          expect(res[i].name).toEqual(new_students[i].name);
          expect(res[i].active).toEqual(new_students[i].active);
        }

        return res;
      });

      for (const student of all_fetched_students) {
        await Testers.Student.ToggleActive(
          { params: { id: student.id } },
          (res) => {
            expect(res).not.toBeNull();
            expect(res!.active).toBe(!student.active);
          },
        );
      }

      const random_ids: number[] = Array.from({ length: 10 }).reduce(
        (agg: number[], _next: undefined) => {
          let random_number =
            Math.floor(Math.random() * (all_fetched_students.length - 1)) + 1;

          while (agg.indexOf(random_number) != -1) {
            random_number =
              Math.floor(Math.random() * (all_fetched_students.length - 1)) + 1;
          }

          agg.push(random_number);
          return agg;
        },
        [] as number[],
      ) as number[];

      for (const id of random_ids) {
        await Testers.Student.Remove({ params: { id } }, (_res) => {});
        await Testers.Student.FindOne({ params: { id } }, (_res) => {}, {
          enforce: { status_code: 404 },
        });

        students1 = students1.filter((v) => v.id !== id);
        students2 = students2.filter((v) => v.id !== id);
      }

      await Testers.Student.FindAll({}, (val) => {
        if (!(val.length == new_students.length - random_ids.length)) {
          console.log(`Random IDs: [${random_ids.join(', ')}]`);
        }
        expect(val).toHaveLength(new_students.length - random_ids.length);
      });

      await Testers.Student.FindAllOfClient(
        {
          params: { id: client1.id },
        },
        (val) => {
          expect(val).toHaveLength(students1.length);
          for (const student of val) {
            expect(students1.findIndex((s) => s.id == student.id)).not.toEqual(
              -1,
            );
          }
        },
      );

      await Testers.Student.FindAllOfClient(
        {
          params: { id: client2.id },
        },
        (val) => {
          expect(val).toHaveLength(students2.length);
          for (const student of val) {
            expect(students2.findIndex((s) => s.id == student.id)).not.toEqual(
              -1,
            );
          }
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Student.FindAll,
      Handlers.Student.FindOne,
      Handlers.Student.Remove,
      Handlers.Student.ToggleActive,
      Handlers.Student.FindAllOfClient,
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

      await Testers.Student.Rename(
        {
          params: { id: student.id },
          body: 'Jane Doe',
        },
        (val) => {
          if ('error' in val) {
            throw new Error(`Error from server: ${val.message}`);
          }

          expect(val?.name).toEqual('Jane Doe');
        },
      );

      await Testers.Student.ToggleActive(
        { params: { id: student.id } },
        (val) => {
          expect(val?.active).toEqual(false);
        },
      );

      await Testers.Student.Rename(
        {
          params: { id: student.id },
          body: 'John Doe',
        },
        (val) => {
          expect('error' in val).toBe(true);
        },
      );

      await Testers.Student.ToggleActive(
        { params: { id: student.id } },
        (val) => {
          expect(val?.active).toEqual(true);
        },
      );

      await Testers.Client.ToggleActive(
        { params: { id: client.id } },
        (val) => {
          expect(val?.active).toEqual(false);
        },
      );

      await Testers.Student.Rename(
        {
          params: { id: student.id },
          body: 'John Doe',
        },
        (val) => {
          expect('error' in val).toBe(true);
        },
      );

      await Testers.Student.FindOne({ params: { id: student.id } }, (val) => {
        expect(val?.name).toEqual('Jane Doe');
      });
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Student.Rename,
      Handlers.Student.FindOne,
      Handlers.Client.ToggleActive,
      Handlers.Student.ToggleActive,
    ],
  );

  gen.test(
    'StudentNote',
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

      const note1 = {
        grade: '4th',
        subjects: ['Math', 'Reading'],
        description: 'Very determined',
        goals: ['Learn more', 'Pass class'],
        timezone: 'America/New_York',
      };
      const note2 = {
        grade: '->Junior',
        subjects: ['SAT', 'EF'],
        description: 'Wants to be a lawyer',
        goals: ['Pass the SAT, get a 1400', 'Stay focused', 'Get good grades'],
        timezone: 'Chicago',
      };

      await Testers.Student.SaveStudentNote(
        {
          params: { id: student1.id },
          body: note1,
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      await Testers.Student.SaveStudentNote(
        {
          params: { id: student2.id },
          body: note2,
        },
        (val) => {
          if (val !== null) throw_server_error(val);
        },
      );

      await Testers.Student.LoadStudentNote(
        { params: { id: student1.id } },
        (val) => {
          if ('error' in val) throw_server_error(val);

          expect(val).toEqual(note1);
        },
      );

      await Testers.Student.LoadStudentNote(
        { params: { id: student2.id } },
        (val) => {
          if ('error' in val) throw_server_error(val);

          expect(val).toEqual(note2);
        },
      );
    },
    [
      Handlers.Client.Create,
      Handlers.Student.Create,
      Handlers.Student.SaveStudentNote,
      Handlers.Student.LoadStudentNote,
    ],
  );
});
