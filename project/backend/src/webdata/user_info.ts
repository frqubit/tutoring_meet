import { BuiltinSerdeType, type SerdeT } from '../utils/serde_utils';
import type { LastElement } from '../utils/type_utils';

export const Version = [
  BuiltinSerdeType.versionable_object({
    username: BuiltinSerdeType.string,
    client_id: BuiltinSerdeType.number,
    expires: BuiltinSerdeType.date,
  }),
  BuiltinSerdeType.versionable_object({
    username: BuiltinSerdeType.string,
    client: BuiltinSerdeType.nullable(
      BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        name: BuiltinSerdeType.string,
      }),
    ),
    expires: BuiltinSerdeType.date,
    is_administrator: BuiltinSerdeType.boolean,
  }),
  BuiltinSerdeType.versionable_object({
    username: BuiltinSerdeType.string,
    client: BuiltinSerdeType.nullable(
      BuiltinSerdeType.object({
        id: BuiltinSerdeType.number,
        name: BuiltinSerdeType.string,
      }),
    ),
    created: BuiltinSerdeType.date,
    expires: BuiltinSerdeType.date,
    is_administrator: BuiltinSerdeType.boolean,
  }),
] as const;

export const LatestVersion = Version[Version.length - 1] as LastElement<
  typeof Version
>;
export type LatestFormat = SerdeT<typeof LatestVersion>;
export const AnyVersion = BuiltinSerdeType.versioned(Version);
