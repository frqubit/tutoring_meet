import { type RawBodyRequest } from '@nestjs/common';
import { DeFailure, Serde, SerdeT, SerFailure } from './serde_utils';
import { OptionalIfUndefined } from './type_utils';
import { Fetcher } from './fetcher_utils';
import { type Request, type Response } from 'express';
import { BACKEND_DOMAIN } from '../config';
import { AuthProblem, AuthProblemCode } from './auth_utils';

type CallVariant<I extends Serde<any> | undefined> =
  'GET' | 'DELETE' | 'PATCH' | EnsureMethodBodyIsDefined<I>;

export type Params = Record<string, Serde<any>>;
export type ParamsT<P extends Params> = {
  [K in keyof P]: SerdeT<P[K]>;
};
type RequestParams<P extends Params> = {
  [K in keyof P]: string;
};

interface ControllerCallData<
  I extends Serde<any> | undefined,
  P extends Params | undefined,
> {
  params: P extends Params ? ParamsT<P> : undefined;
  body: I extends Serde<infer T> ? T : undefined;
}

export interface FetcherData<
  I extends Serde<any> | undefined,
  P extends Params | undefined,
> {
  params: P extends Params ? ParamsT<P> : undefined;
  body: I extends Serde<infer T> ? T : undefined;
}

export type HandlerInfoConstruct<
  I extends Serde<any> | undefined,
  O extends Serde<any>,
  P extends Params | undefined,
> = {
  dev_key: string;
  params?: P;
  call_variant: CallVariant<I>;
  output: O;
};

export class HandlerInfo<
  I extends Serde<any> | undefined,
  O extends Serde<any>,
  P extends Params | undefined,
> {
  public readonly dev_key: string;
  public readonly params: P | undefined;
  public readonly call_variant: CallVariant<I>;
  public readonly output: O;

  public readonly _input_type: I | undefined;

  public constructor(data: HandlerInfoConstruct<I, O, P>) {
    this.dev_key = data.dev_key;
    this.params = data.params;
    this.call_variant = data.call_variant;
    this.output = data.output;
    this._input_type =
      this.call_variant !== 'GET' &&
      this.call_variant !== 'DELETE' &&
      this.call_variant !== 'PATCH'
        ? this.call_variant
        : undefined;
  }

  public path(): string {
    if (this.params === undefined) return this.dev_key;

    const param_keys = Object.keys(this.params)
      .sort()
      .map((k) => `:${k}`);

    return [this.dev_key, ...param_keys].join('/');
  }

  public parameterized_path(
    p: P extends Params ? ParamsT<P> : undefined,
  ): string {
    if (p === undefined) return this.dev_key;

    const FAIL_KEY = `_${this.dev_key}FAILURE`;

    const out = Object.entries(this.params!)
      .toSorted((a, b) => a[0].localeCompare(b[0]))
      .reduce((agg, next) => {
        if (agg == FAIL_KEY) return FAIL_KEY;
        const res = next[1].ser(p[next[0]]);
        if (res instanceof SerFailure) return FAIL_KEY;

        return `${agg}/${encodeURIComponent(res)}`;
      }, this.dev_key);

    if (out == FAIL_KEY) {
      throw new Error('Could not make params work');
    }

    return out;
  }

  public async ControllerCall(
    req: RawBodyRequest<Request>,
    res: Response,
    f: (
      data: ControllerCallData<I, P>,
    ) => SerdeT<O> | AuthProblem | Promise<SerdeT<O> | AuthProblem>,
  ): Promise<Response> {
    const params =
      this.params === undefined
        ? undefined
        : (Object.fromEntries(
            Object.entries(req.params as RequestParams<typeof this.params>).map(
              ([k, v]) => [k, this.params![k].de(v)],
            ),
          ) as ParamsT<typeof this.params>);

    if (this._input_type === undefined) {
      const result = await f({
        params,
        body: undefined,
      } as ControllerCallData<I, P>);

      if (result instanceof AuthProblem) {
        if (result.code == AuthProblemCode.NOT_SIGNED_IN) {
          return res.status(403).send('signin');
        } else if (result.code == AuthProblemCode.TOKENS_EXPIRED) {
          return res.status(403).send('refresh');
        } else {
          return res.status(403).send();
        }
      }

      const serresp = this.output.ser(result);

      if (serresp instanceof SerFailure)
        return res.status(500).send('Serialization failed: ' + serresp.reason);

      return res.status(200).send(Buffer.from(serresp));
    } else {
      const rawBodyString = req.rawBody!.toString('utf8');
      const result = await f({
        params,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: this._input_type.de(rawBodyString),
      } as ControllerCallData<I, P>);

      if (result instanceof AuthProblem) {
        if (result.code == AuthProblemCode.NOT_SIGNED_IN) {
          return res.status(403).send('signin');
        } else if (result.code == AuthProblemCode.TOKENS_EXPIRED) {
          return res.status(403).send('refresh');
        } else {
          return res.status(403).send();
        }
      }

      const serresp = this.output.ser(result);

      if (serresp instanceof SerFailure)
        return res.status(500).send('Serialization failed: ' + serresp.reason);

      return res.status(200).send(Buffer.from(serresp));
    }
  }

  public FetcherFn(f: Fetcher): FetcherFnFromHandlerGenerics<I, O, P> {
    if (
      this.call_variant === 'GET' ||
      this.call_variant === 'DELETE' ||
      this.call_variant === 'PATCH'
    ) {
      const ensured_method = this.call_variant;

      return async (data: OptionalIfUndefined<FetcherData<I, P>>) => {
        // TODO this is tacky obviously, make it detect params type
        // @ts-expect-error for now
        const path = `${f.path}/${this.parameterized_path(data.params)}`;

        const resp = await f.fetch(new URL(path, f.domain), {
          method: ensured_method,
        });

        if (resp.status == 403) {
          const body = await resp.text();

          if (body == 'refresh') {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw f.redirect(
              307,
              new URL(
                `/auth/refresh?state=${f.loading_url_state}`,
                BACKEND_DOMAIN,
              ).toString(),
            );
          } else if (body == 'signin') {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw f.redirect(307, f.signin_url());
          } else {
            throw new Error('Not Authorized');
          }
        }

        return resp.text().then((res) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const resD: SerdeT<O> | DeFailure = this.output.de(res);
          if (resD instanceof DeFailure)
            throw new Error('Serialization failed: ' + resD.reason);
          return resD;
        });
      };
    } else {
      const ensured_serde = this.call_variant;

      return async (
        data: OptionalIfUndefined<FetcherData<typeof ensured_serde, P>>,
      ) => {
        // TODO this is tacky obviously, make it detect params type
        // @ts-expect-error for now
        const path = `${f.path}/${this.parameterized_path(data.params)}`;

        const resp = await f.fetch(new URL(path, f.domain), {
          method: 'POST',
          // TODO this is tacky obviously, make it detect body type
          // @ts-expect-error for now
          body: ensured_serde.ser(data.body),
        });

        if (resp.status == 403) {
          const body = await resp.text();

          if (body == 'refresh') {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw f.redirect(
              307,
              new URL(
                `/auth/refresh?state=${f.loading_url_state}`,
                BACKEND_DOMAIN,
              ).toString(),
            );
          } else if (body == 'signin') {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw f.redirect(307, f.signin_url());
          } else {
            throw new Error('Not Authorized');
          }
        }

        return resp.text().then((res) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const resD: SerdeT<O> | DeFailure = this.output.de(res);
          if (resD instanceof DeFailure)
            throw new Error('Serialization failed: ' + resD.reason);
          return resD;
        });
      };
    }
  }
}

export type OutputOfHandler<H extends HandlerInfo<any, any, any>> =
  H extends HandlerInfo<any, infer O, any> ? SerdeT<O> : never;

export type InputOfHandler<H extends HandlerInfo<any, any, any>> =
  H extends HandlerInfo<infer I, any, any>
    ? I extends Serde<infer T>
      ? T
      : undefined
    : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ControllerType<H extends HandlerInfo<any, any, any>> =
  Promise<Response>;

export type FetcherFnFromHandlerGenerics<
  I extends Serde<any> | undefined,
  O extends Serde<any>,
  P extends Params | undefined,
> = (data: OptionalIfUndefined<FetcherData<I, P>>) => Promise<SerdeT<O>>;

export type FetcherFnT<H extends HandlerInfo<any, any, any>> =
  H extends HandlerInfo<infer I, infer O, infer P>
    ? FetcherFnFromHandlerGenerics<I, O, P>
    : never;

export type HandlerRecordToFetcherFns<
  H extends Record<string, HandlerInfo<any, any, any>>,
> = {
  [Key in keyof H]: FetcherFnT<H[Key]>;
};

export type FetcherOutput<
  F extends (...args: any[]) => HandlerRecordToFetcherFns<any>,
  K extends keyof ReturnType<F>,
> = ReturnType<F>[K] extends (...args: any[]) => Promise<infer O> ? O : never;

type EnsureMethodBodyIsDefined<M extends Serde<any> | undefined> =
  M extends Serde<any> ? M : never;
