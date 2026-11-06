import type fetch_fn from 'node-fetch';
import { BACKEND_DOMAIN, COGNITO_BASE_URI } from '../config';
import { HandlerInfo, HandlerRecordToFetcherFns } from './handler_utils';

interface FetcherConfig {
  path: string;
  domain: string;
  fetch: typeof fetch_fn;
  redirect: (code: number, path: string) => never;
  loading_url: URL;
}

export type FetcherConfigUser = Omit<FetcherConfig, 'path'>;

export class Fetcher {
  protected readonly _loading_url_state: string;

  constructor(protected readonly config: FetcherConfig) {
    const PATH_SEGMENT_REGEX = /^https?:\/\/[\da-z.-]+(?::\d+)?(\/.*)$/;
    const url_state = PATH_SEGMENT_REGEX.exec(config.loading_url.href);
    if (url_state == null)
      throw new Error(
        `Invalid URL not matching path segment state regex: ${config.loading_url.href}`,
      );
    this._loading_url_state = url_state[1];
  }

  public get path() {
    return this.config.path;
  }

  public get domain() {
    return this.config.domain;
  }

  public get fetch() {
    return this.config.fetch;
  }

  public get redirect() {
    return this.config.redirect;
  }

  public get loading_url_state() {
    return btoa(this._loading_url_state);
  }

  public signin_url(): string {
    const out = new URL('/login/continue', COGNITO_BASE_URI);
    out.search = new URLSearchParams({
      client_id: '2cq5ns7arvn12i9ll973hdj0f9',
      response_type: 'code',
      scope: 'email+openid+phone',
      redirect_uri: new URL('/auth', BACKEND_DOMAIN).toString(),
      state: this.loading_url_state,
    }).toString();

    // URLSearchParams is stupid and replaces the pluses in the
    // scope with %2B :/
    return out.toString().replaceAll('%2B', '+');
  }
}

export function FetcherGenerator<
  H extends Record<string, HandlerInfo<any, any, any>>,
>(
  path: string,
  handler_record: H,
): (config: FetcherConfigUser) => HandlerRecordToFetcherFns<H> {
  return (config) => {
    const fetcher = new Fetcher({
      ...config,
      path: `/${path}`,
    });

    return Object.fromEntries(
      Object.entries(handler_record).map((kv) => {
        const [k, v] = kv;
        return [k, v.FetcherFn(fetcher)];
      }),
    ) as unknown as HandlerRecordToFetcherFns<H>;
  };
}
