import { describe, test } from 'vitest';
import { TESTS as ClientTests } from './suites/client';
import { TESTS as DepositTests } from './suites/deposit';
import { TESTS as StudentTests } from './suites/student';
import { TESTS as SessionTests } from './suites/session';
import { Handlers } from '@/src/utils/e2e_utils';

describe('Safety Tests', () => {
  test('all handler methods used', () => {
    const ALL_TESTS = [ClientTests, DepositTests, StudentTests, SessionTests];
    const ALL_HANDLER_CODES = Object.values(Handlers)
      .map((v) => Object.values(v))
      .flat();

    const leftover_handlers = ALL_TESTS.reduce(
      (agg, next) => next().mark_off_contained_handlers(agg),
      ALL_HANDLER_CODES,
    );

    if (leftover_handlers.length != 0) {
      let error_message = `${leftover_handlers.length} handlers have not been end-to-end tested:\n`;
      for (const leftover_handler of leftover_handlers) {
        error_message = error_message + `\t${leftover_handler}\n`;
      }

      throw new Error(error_message);
    }
  });
});

ClientTests().execute();
DepositTests().execute();
StudentTests().execute();
SessionTests().execute();
