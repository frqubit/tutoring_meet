import { BuiltinSerdeType } from '../../utils/serde_utils';
import { HandlerInfo } from '../../utils/handler_utils';
import { FetcherGenerator } from '../../utils/fetcher_utils';
import { SessionCompletion } from '../../entities/Session.enum';
import { LatestVersion as LatestSessionNoteVersion } from '@/src/webdata/session_note';

const SessionValue = BuiltinSerdeType.object({
  id: BuiltinSerdeType.number,
  index: BuiltinSerdeType.number,
  date: BuiltinSerdeType.date,
  minutes: BuiltinSerdeType.number,
  ends: BuiltinSerdeType.nullable(BuiltinSerdeType.date),
  every: BuiltinSerdeType.number,
  completed: BuiltinSerdeType.enum(SessionCompletion),
  students: BuiltinSerdeType.array(
    BuiltinSerdeType.object({
      id: BuiltinSerdeType.number,
      name: BuiltinSerdeType.string,
      client: BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        name: BuiltinSerdeType.string,
      }),
    }),
  ),
});

export const SessionNoteValue = BuiltinSerdeType.object({
  summary: BuiltinSerdeType.string,
  description: BuiltinSerdeType.string,
});

export const PATH = 'session';

export const Handlers = {
  FindAll: new HandlerInfo({
    dev_key: 'find_all',
    call_variant: 'GET',
    output: BuiltinSerdeType.array(SessionValue),
  }),

  FindOne: new HandlerInfo({
    dev_key: 'find_one',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(SessionValue),
  }),

  FindNextOfClient: new HandlerInfo({
    dev_key: 'find_next_of_client',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(SessionValue),
  }),

  FindFutureDatesOf: new HandlerInfo({
    dev_key: 'find_future_dates_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.array(
      BuiltinSerdeType.object({
        date: BuiltinSerdeType.date,
        minutes: BuiltinSerdeType.number,
      }),
    ),
  }),

  Create: new HandlerInfo({
    dev_key: 'create',
    call_variant: BuiltinSerdeType.object({
      student_id: BuiltinSerdeType.number,
      date: BuiltinSerdeType.date,
      minutes: BuiltinSerdeType.number,
      ends: BuiltinSerdeType.optional(BuiltinSerdeType.date),
      every: BuiltinSerdeType.number,
    }),
    output: BuiltinSerdeType.fallible(SessionValue),
  }),

  Submit: new HandlerInfo({
    dev_key: 'submit',
    call_variant: BuiltinSerdeType.array(BuiltinSerdeType.string),
    // call_variant: BuiltinSerdeType.object({
    //   subject: BuiltinSerdeType.string,
    //   tutor_notes: BuiltinSerdeType.array(BuiltinSerdeType.string),
    //   event_summary: BuiltinSerdeType.array(BuiltinSerdeType.string),
    // }),
    params: {
      id: BuiltinSerdeType.number,
      variant: BuiltinSerdeType.enum(SessionCompletion),
    },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),

  Remove: new HandlerInfo({
    dev_key: 'remove',
    call_variant: 'DELETE',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),

  RemoveOneInSeries: new HandlerInfo({
    dev_key: 'remove_one_in_series',
    call_variant: 'DELETE',
    params: { id: BuiltinSerdeType.number, index: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),

  FindAllUpcoming: new HandlerInfo({
    dev_key: 'find_all_upcoming',
    call_variant: 'GET',
    output: BuiltinSerdeType.array(SessionValue),
  }),

  FindAllByFilter: new HandlerInfo({
    dev_key: 'filter',
    call_variant: BuiltinSerdeType.object({
      start: BuiltinSerdeType.optional(BuiltinSerdeType.date),
      end: BuiltinSerdeType.optional(BuiltinSerdeType.date),
      student_id: BuiltinSerdeType.optional(BuiltinSerdeType.number),
      client_id: BuiltinSerdeType.optional(BuiltinSerdeType.number),
      completed: BuiltinSerdeType.optional(BuiltinSerdeType.boolean),
      max_count: BuiltinSerdeType.optional(BuiltinSerdeType.number),
    }),
    output: BuiltinSerdeType.array(SessionValue),
  }),

  Reschedule: new HandlerInfo({
    dev_key: 'reschedule',
    call_variant: BuiltinSerdeType.object({
      date: BuiltinSerdeType.date,
      minutes: BuiltinSerdeType.number,
      all: BuiltinSerdeType.boolean,
    }),
    params: { id: BuiltinSerdeType.number, index: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),

  AddStudentToSession: new HandlerInfo({
    dev_key: 'add_student_to_session',
    call_variant: 'GET',
    params: {
      sessionId: BuiltinSerdeType.number,
      studentId: BuiltinSerdeType.number,
    },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),

  RemoveStudentFromSession: new HandlerInfo({
    dev_key: 'remove_student_from_session',
    call_variant: 'GET',
    params: {
      sessionId: BuiltinSerdeType.number,
      studentId: BuiltinSerdeType.number,
    },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),

  AddNoteToSession: new HandlerInfo({
    dev_key: 'add_note_to_session',
    call_variant: BuiltinSerdeType.object({
      subject: BuiltinSerdeType.string,
      tutor_plan: BuiltinSerdeType.array(BuiltinSerdeType.string),
      event_summary: BuiltinSerdeType.array(BuiltinSerdeType.string),
    }),
    params: {
      sessionId: BuiltinSerdeType.number,
      studentId: BuiltinSerdeType.number,
    },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),

  GetNoteForSession: new HandlerInfo({
    dev_key: 'get_note_for_session',
    call_variant: 'GET',
    params: {
      sessionId: BuiltinSerdeType.number,
      studentId: BuiltinSerdeType.number,
    },
    output: BuiltinSerdeType.nullable(
      BuiltinSerdeType.object({
        subject: BuiltinSerdeType.string,
        session_id: BuiltinSerdeType.number,
        session_date: BuiltinSerdeType.date,
        tutor_plan: BuiltinSerdeType.array(BuiltinSerdeType.string),
        event_summary: BuiltinSerdeType.array(BuiltinSerdeType.string),
      }),
    ),
  }),
};

export const SessionFetcher = FetcherGenerator(PATH, Handlers);

export default Handlers;
