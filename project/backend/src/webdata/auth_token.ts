import { BuiltinSerdeType, SerdeT } from '../utils/serde_utils';
import { LastElement } from '../utils/type_utils';

export const Version = [
  BuiltinSerdeType.versionable_object({
    user: BuiltinSerdeType.nullable(
      BuiltinSerdeType.object({
        username: BuiltinSerdeType.string,
        userid: BuiltinSerdeType.number,
      }),
    ),
    groups: BuiltinSerdeType.object({
      administrator: BuiltinSerdeType.boolean,
    }),
    expires: BuiltinSerdeType.date,
    _check: BuiltinSerdeType.string,
  }),
  BuiltinSerdeType.versionable_object({
    user: BuiltinSerdeType.nullable(
      BuiltinSerdeType.object({
        username: BuiltinSerdeType.string,
        userid: BuiltinSerdeType.number,
      }),
    ),
    groups: BuiltinSerdeType.object({
      administrator: BuiltinSerdeType.boolean,
    }),
    created: BuiltinSerdeType.date,
    expires: BuiltinSerdeType.date,
    _check: BuiltinSerdeType.string,
  }),
] as const;

export const LatestVersion = Version[Version.length - 1] as LastElement<
  typeof Version
>;
export type LatestFormat = SerdeT<typeof LatestVersion>;
export const AnyVersion = BuiltinSerdeType.versioned(Version);
