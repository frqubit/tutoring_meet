import { BuiltinSerdeType, SerdeT } from '../utils/serde_utils';
import { LastElement } from '../utils/type_utils';

export const Version = [
  BuiltinSerdeType.versionable_object({
    sessions: BuiltinSerdeType.array(
      BuiltinSerdeType.object({
        subject: BuiltinSerdeType.string,
        session_id: BuiltinSerdeType.number,
        session_date: BuiltinSerdeType.date,
        tutor_plan: BuiltinSerdeType.array(BuiltinSerdeType.string),
        event_summary: BuiltinSerdeType.array(BuiltinSerdeType.string),
      }),
    ),
  }),
] as const;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
export const LatestVersion = Version[Version.length - 1] as LastElement<
  typeof Version
>;
export type LatestFormat = SerdeT<typeof LatestVersion>;
export const AnyVersion = BuiltinSerdeType.versioned(Version);
