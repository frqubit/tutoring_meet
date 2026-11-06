import { BuiltinSerdeType } from '../../utils/serde_utils';
import { HandlerInfo } from '../../utils/handler_utils';
import { FetcherGenerator } from '../../utils/fetcher_utils';
import { LatestVersion as LatestUserInfoVersion } from '../../webdata/user_info';

export const PATH = 'auth';

export const Handlers = {
  CreateUserFromClient: new HandlerInfo({
    dev_key: 'create_user_from_client',
    call_variant: BuiltinSerdeType.object({
      email: BuiltinSerdeType.string,
    }),
    params: { id: BuiltinSerdeType.number },
    output: BuiltinSerdeType.nullable(BuiltinSerdeType.string),
  }),

  GetMyUserInfo: new HandlerInfo({
    dev_key: 'get_my_user_info',
    call_variant: 'GET',
    output: BuiltinSerdeType.nullable(LatestUserInfoVersion),
  }),

  GetPublicKey: new HandlerInfo({
    dev_key: 'get_public_key',
    call_variant: 'GET',
    output: BuiltinSerdeType.uint8array,
  }),
};

export const AuthFetcher = FetcherGenerator(PATH, Handlers);

export default Handlers;
