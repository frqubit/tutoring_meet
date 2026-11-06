import { temporaryFile } from 'tempy';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, lstat } from 'node:fs/promises';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { db_module, ROOT_MODULE_IMPORTS_NODB } from './app_utils';
import { App } from 'supertest/types';
import { FetcherData, HandlerInfo, Params, ParamsT } from './handler_utils';
import TestAgent from 'supertest/lib/agent';
import { enforce, OptionalIfUndefined } from './type_utils';
import request from 'supertest';
import { Serde, SerdeT, SerFailure } from './serde_utils';
import { fail } from 'node:assert';
import {
  PATH as CLIENT_PATH,
  Handlers as ClientHandlers,
} from '../modules/client/Client.handlers';
import {
  PATH as DEPOSIT_PATH,
  Handlers as DepositHandlers,
} from '../modules/deposit/Deposit.handlers';
import {
  PATH as SESSION_PATH,
  Handlers as SessionHandlers,
} from '../modules/session/Session.handlers';
import {
  PATH as STUDENT_PATH,
  Handlers as StudentHandlers,
} from '../modules/student/Student.handlers';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  describe as vitest_describe,
  test as vitest_test,
  expect as vitest_expect,
} from 'vitest';
import { Error as ServerError } from '../modules/Error';
import { WebDataService } from '../modules/webdata/WebData.service';
import { MockWebDataService } from '../modules/webdata/WebData.mock';

const exec_async = promisify(exec);

class NoValueCode {}
export class ExpectedFailureOutput {}

export function e2e_init() {}

async function blank_sql_exists(repo_root: string): Promise<boolean> {
  try {
    await lstat(`${repo_root}/blank.sql`);
    return true;
  } catch {
    return false;
  }
}

export async function create_temporary_blank_sqlite_db_path(): Promise<string> {
  const repository_root = await exec_async(
    'batl which frqubit.tutoring.database',
  ).then((res) => res.stdout.replace('\n', ''));

  if (!(await blank_sql_exists(repository_root))) {
    throw new Error('Cannot find blank.sql');
  }

  const temporary_path = temporaryFile();

  // await exec_async(`cp -f ${repository_root}/blank.sql ${temporary_path}`);

  await copyFile(`${repository_root}/blank.sql`, temporary_path);

  return temporary_path;
}

export async function create_testNestApplication(): Promise<
  INestApplication<App>
> {
  const temporary_db_path = await create_temporary_blank_sqlite_db_path();
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [...ROOT_MODULE_IMPORTS_NODB, db_module(temporary_db_path)],
  })
    .overrideProvider(WebDataService)
    .useValue(new MockWebDataService())
    .compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    rawBody: true,
  });
  app.useBodyParser('text');

  return app;
}

export function correct_method_function(
  method: string,
  request: TestAgent,
  path: string,
) {
  if (method === 'GET') {
    return request.get(path);
  } else if (method === 'DELETE') {
    return request.delete(path);
  } else if (method === 'PATCH') {
    return request.patch(path);
  } else {
    return request.post(path);
  }
}

export function TesterFnFromGenerics<
  I extends Serde<any> | undefined,
  O extends Serde<any>,
  P extends Params | undefined,
>(
  Ival: I,
  Oval: O,
  Pval: P,
  handler: HandlerInfo<I, O, P>,
  base_uri: string,
  app: INestApplication<App>,
  cb: OnUseTesterCb,
): TesterFnFromHandlerGenerics<I, O, P> {
  if (
    handler.call_variant === 'GET' ||
    handler.call_variant === 'PATCH' ||
    handler.call_variant === 'DELETE'
  ) {
    const ensured_method = handler.call_variant;

    return async (data, jester, extras?) => {
      cb(`${base_uri}/${handler.dev_key}`);

      // @ts-expect-error SHAPE UP
      const data_params: P extends Params ? ParamsT<P> : undefined =
        'params' in data ? data.params : undefined;

      let output: ReturnType<typeof jester> | NoValueCode = new NoValueCode();

      await correct_method_function(
        ensured_method,
        request(app.getHttpServer()),
        `/${base_uri}/${handler.parameterized_path(data_params)}`,
      )
        .expect((res) => {
          if (extras?.enforce?.status_code !== undefined) {
            if (res.status !== extras.enforce.status_code)
              throw new Error(
                `Expected enforced status code ${extras.enforce.status_code}, but got ${res.status}`,
              );
          } else if (res.status < 200 || res.status >= 300) {
            throw new Error(
              `Expected a success status code, but got ${res.status}`,
            );
          }
        })
        .expect((res) => {
          if (res.statusCode < 200 || res.status >= 300) {
            return new ExpectedFailureOutput();
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const resD = handler.output.de(res.text);
          if (resD instanceof SerFailure) return fail(resD.reason);

          output = jester(resD);
        });

      if (!(output instanceof NoValueCode)) {
        return output;
      }

      // if it's stupid but works it's not stupid lol
      return undefined as ReturnType<typeof jester>;
    };
  } else {
    const ensured_cv = handler.call_variant;

    return async (data, jester, extras?) => {
      cb(`${base_uri}/${handler.dev_key}`);

      if (!('body' in data)) return fail('is post method but no body?');
      // @ts-expect-error SHAPE UP
      const data_params: P extends Params ? ParamsT<P> : undefined =
        'params' in data ? data.params : undefined;

      const resS = ensured_cv.ser(data.body);
      if (resS instanceof SerFailure) return fail(resS.reason);

      let output: ReturnType<typeof jester> | NoValueCode = new NoValueCode();

      await request(app.getHttpServer())
        .post(`/${base_uri}/${handler.parameterized_path(data_params)}`)
        .set('Content-Type', 'text/plain')
        .send(resS)
        .expect((res) => {
          if (
            extras?.enforce?.status_code !== undefined &&
            res.status !== extras.enforce.status_code
          ) {
            throw new Error(
              `Expected enforced status code ${extras.enforce.status_code}, but got ${res.status}`,
            );
          } else if (res.status < 200 || res.status >= 300) {
            throw new Error(
              `Expected a success status code, but got ${res.status}`,
            );
          }
        })
        .expect((res) => {
          if (res.statusCode < 200 || res.status >= 300) {
            return new ExpectedFailureOutput();
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const resD = handler.output.de(res.text);
          if (resD instanceof SerFailure) return fail(resD.reason);

          output = jester(resD);
        });

      if (!(output instanceof NoValueCode)) {
        return output;
      }

      // if it's stupid but works it's not stupid lol
      return undefined as ReturnType<typeof jester>;
    };
  }
}

export function TesterFn<
  H extends HandlerInfo<Serde<any> | undefined, Serde<any>, Params | undefined>,
>(handler: H, base_uri: string, app: INestApplication<App>, cb: OnUseTesterCb) {
  return TesterFnFromGenerics(
    handler._input_type,
    handler.output,
    handler.params,
    handler,
    base_uri,
    app,
    cb,
  );
}

export function TesterGenerator<
  H extends Record<string, HandlerInfo<any, any, any>>,
>(
  path: string,
  handler_record: H,
): (
  app: INestApplication<App>,
  on_use: OnUseTesterCb,
) => HandlerRecordToTesterFns<H> {
  return (app, on_use) => {
    return Object.fromEntries(
      Object.entries(handler_record).map((kv) => {
        const [k, v] = kv;
        return [k, TesterFn(v, path, app, on_use)];
      }),
    ) as unknown as HandlerRecordToTesterFns<H>;
  };
}

type OnUseTesterCb = (dev_key: string) => void;

export type HandlerRecordToTesterFns<
  H extends Record<string, HandlerInfo<any, any, any>>,
> = {
  [Key in keyof H]: TesterFnT<H[Key]>;
};

export type TesterFnT<H extends HandlerInfo<any, any, any>> =
  H extends HandlerInfo<infer I, infer O, infer P>
    ? TesterFnFromHandlerGenerics<I, O, P>
    : never;

type TesterFnFromHandlerGenerics<
  I extends Serde<any> | undefined,
  O extends Serde<any>,
  P extends Params | undefined,
> = <T>(
  data: OptionalIfUndefined<FetcherData<I, P>>,
  jester: (res: SerdeT<O>) => T,
  extras?: TesterFnExtras,
) => Promise<T>;

interface TesterFnExtras {
  enforce?: {
    status_code?: number;
  };
}

const _HANDLERS = {
  Client: ClientHandlers,
  Student: StudentHandlers,
  Session: SessionHandlers,
  Deposit: DepositHandlers,
};

const _HANDLER_BASE_URIS = enforce<Record<keyof typeof _HANDLERS, string>>({
  Client: CLIENT_PATH,
  Student: STUDENT_PATH,
  Session: SESSION_PATH,
  Deposit: DEPOSIT_PATH,
});

type HandlersAsTesters = {
  [Key in keyof typeof _HANDLERS]: ReturnType<
    typeof TesterGenerator<(typeof _HANDLERS)[Key]>
  >;
};

const TESTERS = enforce<HandlersAsTesters>({
  Client: TesterGenerator(CLIENT_PATH, ClientHandlers),
  Student: TesterGenerator(STUDENT_PATH, StudentHandlers),
  Session: TesterGenerator(SESSION_PATH, SessionHandlers),
  Deposit: TesterGenerator(DEPOSIT_PATH, DepositHandlers),
});

type CalledTesterMap = {
  [Key in keyof HandlersAsTesters]: ReturnType<HandlersAsTesters[Key]>;
};

type HandlerCodes = {
  [Key in keyof typeof _HANDLERS]: {
    [_K2 in keyof (typeof _HANDLERS)[Key]]: string;
  };
};

const _HandlerCodes = ((): HandlerCodes => {
  return Object.fromEntries(
    Object.entries(_HANDLERS).map(([k, h_parent]) => [
      k,
      Object.fromEntries(
        Object.entries(h_parent).map(([kinner, h]) => [
          kinner,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `${_HANDLER_BASE_URIS[k]}/${h.dev_key}`,
        ]),
      ),
    ]),
  ) as unknown as HandlerCodes;
})();

export const Handlers = _HandlerCodes;

function get_called_testers(
  app: INestApplication<App>,
  cb: OnUseTesterCb,
): CalledTesterMap {
  return Object.fromEntries(
    Object.entries(TESTERS).map(([k, v]) => [k, v(app, cb)]),
  ) as unknown as CalledTesterMap;
}

type E2ETestFn = (testers: CalledTesterMap) => Promise<void>;

export class E2ETest {
  private readonly _dev_name: string;
  private readonly _test_fn: E2ETestFn;
  private readonly _handlers_assigned: string[];

  constructor(
    dev_name: string,
    test_fn: E2ETestFn,
    handlers_assigned: string[],
  ) {
    this._dev_name = dev_name;
    this._test_fn = test_fn;
    this._handlers_assigned = handlers_assigned;
  }

  public mark_off_contained_handlers(checklist: string[]): string[] {
    return checklist.filter((v) => this._handlers_assigned.indexOf(v) == -1);
  }

  public async execute() {
    const app = await create_testNestApplication();
    await app.init();

    // ensure cloned copy
    let handlers_left = this._handlers_assigned.map((v) => v);

    const called_testers = get_called_testers(app, (handler_code) => {
      if (this._handlers_assigned.indexOf(handler_code) == -1) {
        throw new Error(
          `Attempted to use handler ${handler_code} which is not assigned to test ${this._dev_name}`,
        );
      }

      if (handlers_left.indexOf(handler_code) != -1) {
        handlers_left = handlers_left.filter((v) => v != handler_code);
      }
    });

    vitest_test(this._dev_name, async () => {
      await this._test_fn(called_testers);

      vitest_expect(
        handlers_left,
        'All requested handlers must be used',
      ).toHaveLength(0);
    });
  }
}

export class _E2ETestGenerator {
  private tests: E2ETest[] = [];
  private finalized: boolean = false;
  private dev_name: string;

  public constructor(dev_name: string) {
    this.dev_name = dev_name;
  }

  public test(dev_name: string, test_fn: E2ETestFn, handlers_used: string[]) {
    this.tests.push(new E2ETest(dev_name, test_fn, handlers_used));
  }

  public finalize() {
    if (!this.finalized) {
      this.finalized = true;
    } else {
      throw new Error('Test generator was somehow already finalized');
    }
  }

  public execute() {
    if (!this.finalized) throw new Error('Must be finalized to execute');

    vitest_describe(this.dev_name, async () => {
      for (const e2e_test of this.tests) {
        await e2e_test.execute();
      }
    });
  }

  public mark_off_contained_handlers(checklist: string[]): string[] {
    return this.tests.reduce(
      (agg, next) => next.mark_off_contained_handlers(agg),
      checklist,
    );
  }
}

export function gen_e2e_tests(
  dev_name: string,
  generator: (gen: _E2ETestGenerator) => void,
): () => _E2ETestGenerator {
  return () => {
    const _gen = new _E2ETestGenerator(dev_name);

    generator(_gen);
    _gen.finalize();

    return _gen;
  };
}

export function throw_server_error(e: ServerError): never {
  throw new Error(`Error from server: ${e.message}`);
}

export const MS_IN = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
};
