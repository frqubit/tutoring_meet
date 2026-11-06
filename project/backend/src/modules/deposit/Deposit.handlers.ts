import { BuiltinSerdeType } from '../../utils/serde_utils';
import { HandlerInfo } from '../../utils/handler_utils';
import { FetcherGenerator } from '../../utils/fetcher_utils';

export const PATH = 'deposit';

const DepositValue = BuiltinSerdeType.object({
  id: BuiltinSerdeType.number,
  date: BuiltinSerdeType.date,
  cents: BuiltinSerdeType.number,
  client: BuiltinSerdeType.object({
    id: BuiltinSerdeType.number,
    name: BuiltinSerdeType.string,
  }),
});

export const Handlers = {
  FindOne: new HandlerInfo({
    dev_key: 'find_one',
    call_variant: 'GET',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(DepositValue),
  }),

  FindAll: new HandlerInfo({
    dev_key: 'find_all',
    call_variant: 'GET',
    output: BuiltinSerdeType.array(DepositValue),
  }),

  Create: new HandlerInfo({
    dev_key: 'create',
    call_variant: BuiltinSerdeType.object({
      client_id: BuiltinSerdeType.number,
      date: BuiltinSerdeType.date,
      cents: BuiltinSerdeType.number,
    }),
    output: BuiltinSerdeType.fallible(DepositValue),
  }),

  Remove: new HandlerInfo({
    dev_key: 'remove',
    call_variant: 'DELETE',
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.object({}),
  }),
};

export const DepositFetcher = FetcherGenerator(PATH, Handlers);

export default Handlers;
