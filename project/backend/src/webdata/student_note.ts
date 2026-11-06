import { BuiltinSerdeType, type SerdeT } from '../utils/serde_utils';
import { LastElement } from '../utils/type_utils';

export const Version = [
  BuiltinSerdeType.versionable_object({
    grade: BuiltinSerdeType.string,
    subjects: BuiltinSerdeType.array(BuiltinSerdeType.string),
    description: BuiltinSerdeType.string,
    goals: BuiltinSerdeType.array(BuiltinSerdeType.string),
  }),
  BuiltinSerdeType.versionable_object({
    grade: BuiltinSerdeType.string,
    subjects: BuiltinSerdeType.array(BuiltinSerdeType.string),
    description: BuiltinSerdeType.string,
    goals: BuiltinSerdeType.array(BuiltinSerdeType.string),
    timezone: BuiltinSerdeType.string,
  }),
] as const;

export const LatestVersion = Version[Version.length - 1] as LastElement<
  typeof Version
>;
export type LatestFormat = SerdeT<typeof LatestVersion>;
export const AnyVersion = BuiltinSerdeType.versioned(Version);
