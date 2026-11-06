import { ClientV1_1783099751854 } from "./migration/clientv1";
import { ClientV2_1791308810854 } from "./migration/clientv2";
import { ClientV3_1792809705000 } from "./migration/clientv3";
import { MultipleStudentSessions_1779284722000 } from "./migration/multiple_student_sessions";
import { SessionV2_1771530523898 } from "./migration/sessionv2";
import { SessionV3_1774016734898 } from "./migration/sessionv3";
import { SessionV4_1778169398000 } from "./migration/sessionv4";
import { SessionV5_1779123328000 } from "./migration/sessionv5";
import { SessionV6_1789757458000 } from "./migration/sessionv6";

const MIGRATIONS = [
  SessionV2_1771530523898,
  SessionV3_1774016734898,
  SessionV4_1778169398000,
  SessionV5_1779123328000,
  SessionV6_1789757458000,
  MultipleStudentSessions_1779284722000,
  ClientV1_1783099751854,
  ClientV2_1791308810854,
  ClientV3_1792809705000,
];

export default MIGRATIONS;
