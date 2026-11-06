import { BuiltinSerdeType } from '../../utils/serde_utils';
import { HandlerInfo } from '../../utils/handler_utils';
import { Fetcher, FetcherGenerator } from '../../utils/fetcher_utils';
import { SessionCompletion } from '../../entities/Session.enum';

export const PATH = 'client';

const ClientValue = BuiltinSerdeType.object({
  id: BuiltinSerdeType.number,
  name: BuiltinSerdeType.string,
  user_account: BuiltinSerdeType.nullable(BuiltinSerdeType.string),
  active: BuiltinSerdeType.boolean,
});

export const Handlers = {
  FindAll: new HandlerInfo({
    dev_key: 'find_all',
    call_variant: 'GET',
    output: BuiltinSerdeType.array(ClientValue),
  }),

  FindOne: new HandlerInfo({
    dev_key: 'find_one',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(ClientValue),
  }),

  Create: new HandlerInfo({
    dev_key: 'create',
    call_variant: BuiltinSerdeType.object({
      name: BuiltinSerdeType.string,
      active: BuiltinSerdeType.boolean,
    }),
    output: ClientValue,
  }),

  ToggleActive: new HandlerInfo({
    dev_key: 'toggle_active',
    call_variant: 'PATCH',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(ClientValue),
  }),

  Remove: new HandlerInfo({
    dev_key: 'remove',
    call_variant: 'DELETE',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.void,
  }),

  FindAllDepositsOf: new HandlerInfo({
    dev_key: 'find_all_deposits_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.array(
      BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        date: BuiltinSerdeType.date,
        cents: BuiltinSerdeType.number,
      }),
    ),
  }),

  FindAllCompletedSessionsOf: new HandlerInfo({
    dev_key: 'find_all_completed_sessions_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.array(
      BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        date: BuiltinSerdeType.date,
        minutes: BuiltinSerdeType.number,
        completed: BuiltinSerdeType.enum(SessionCompletion),
        students: BuiltinSerdeType.array(
          BuiltinSerdeType.object({
            id: BuiltinSerdeType.number,
            name: BuiltinSerdeType.string,
          }),
        ),
      }),
    ),
  }),

  FindRecentCompletedSessionsOf: new HandlerInfo({
    dev_key: 'find_recent_completed_sessions_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.array(
      BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        date: BuiltinSerdeType.date,
        minutes: BuiltinSerdeType.number,
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
      }),
    ),
  }),

  GetBalanceOf: new HandlerInfo({
    dev_key: 'get_balance_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.number,
  }),

  GetNextInvoiceOf: new HandlerInfo({
    dev_key: 'get_next_invoice_of',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(
      BuiltinSerdeType.object({
        month_number: BuiltinSerdeType.number,
        charges: BuiltinSerdeType.array(
          BuiltinSerdeType.object({
            name: BuiltinSerdeType.string,
            date: BuiltinSerdeType.date,
            student_name: BuiltinSerdeType.string,
            cents: BuiltinSerdeType.number,
          }),
        ),
      }),
    ),
  }),

  Rename: new HandlerInfo({
    dev_key: 'rename',
    call_variant: BuiltinSerdeType.string,
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.fallible(ClientValue),
  }),

  MergeInto: new HandlerInfo({
    dev_key: 'merge_into',
    call_variant: 'GET',
    params: {
      source: BuiltinSerdeType.number,
      target: BuiltinSerdeType.number,
    },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.error),
  }),
};

export const ClientFetcher = FetcherGenerator(PATH, Handlers);

export default Handlers;
