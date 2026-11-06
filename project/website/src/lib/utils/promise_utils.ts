import { browser } from "$app/environment";

export class NotOnClient {}

export class ClientPromise<P extends Promise<any>> {
  private _promise: () => P;

  constructor(promise_fn: () => P) {
    this._promise = promise_fn;
  }

  async resolve(): Promise<Awaited<P> | NotOnClient> {
    if (!browser) return new NotOnClient();

    return await this._promise();
  }

  get resolver(): Promise<Awaited<P> | NotOnClient> {
    return this.resolve();
  }
}
