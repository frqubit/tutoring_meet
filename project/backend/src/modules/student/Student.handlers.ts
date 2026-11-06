import { BuiltinSerdeType } from '../../utils/serde_utils';
import { HandlerInfo } from '../../utils/handler_utils';
import { FetcherGenerator } from '../../utils/fetcher_utils';
import {
  AnyVersion as AnyStudentNoteVersion,
  LatestVersion as LatestStudentNoteVersion,
} from '../../webdata/student_note';
import { SessionCompletion } from '../../entities/Session.enum';

export const PATH = 'student';

const StudentValue = BuiltinSerdeType.object({
  id: BuiltinSerdeType.number,
  name: BuiltinSerdeType.string,
  active: BuiltinSerdeType.boolean,
  client: BuiltinSerdeType.object({
    id: BuiltinSerdeType.number,
    name: BuiltinSerdeType.string,
  }),
});

export const Handlers = {
  FindAll: new HandlerInfo({
    dev_key: 'find_all',
    call_variant: 'GET',
    output: BuiltinSerdeType.array(StudentValue),
  }),

  FindAllOfClient: new HandlerInfo({
    dev_key: 'find_all_of_client',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.array(StudentValue),
  }),

  FindOne: new HandlerInfo({
    dev_key: 'find_one',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(StudentValue),
  }),

  Create: new HandlerInfo({
    dev_key: 'create',
    call_variant: BuiltinSerdeType.object({
      name: BuiltinSerdeType.string,
      active: BuiltinSerdeType.boolean,
      client_id: BuiltinSerdeType.number,
    }),
    output: BuiltinSerdeType.fallible(StudentValue),
  }),

  ToggleActive: new HandlerInfo({
    dev_key: 'toggle_active',
    call_variant: 'PATCH',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(StudentValue),
  }),

  Remove: new HandlerInfo({
    dev_key: 'remove',
    call_variant: 'DELETE',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.void,
  }),

  FindAllCompletedSessionsOf: new HandlerInfo({
    dev_key: 'find_all_completed_sessions_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.array(
      BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        date: BuiltinSerdeType.date,
        completed: BuiltinSerdeType.enum(SessionCompletion),
        minutes: BuiltinSerdeType.number,
        students: BuiltinSerdeType.array(
          BuiltinSerdeType.object({
            id: BuiltinSerdeType.number,
            name: BuiltinSerdeType.string,
          }),
        ),
      }),
    ),
  }),

  FindAllFutureSessionsOf: new HandlerInfo({
    dev_key: 'find_all_future_sessions_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.array(
      BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        date: BuiltinSerdeType.date,
        minutes: BuiltinSerdeType.number,
        every: BuiltinSerdeType.number,
        ends: BuiltinSerdeType.nullable(BuiltinSerdeType.date),
      }),
    ),
  }),

  Rename: new HandlerInfo({
    dev_key: 'rename',
    call_variant: BuiltinSerdeType.string,
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.fallible(StudentValue),
  }),

  LoadStudentNote: new HandlerInfo({
    dev_key: 'load_student_note',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.fallible(AnyStudentNoteVersion),
  }),

  SaveStudentNote: new HandlerInfo({
    dev_key: 'save_student_note',
    call_variant: LatestStudentNoteVersion,
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),
};

export const StudentFetcher = FetcherGenerator(PATH, Handlers);

export default Handlers;
