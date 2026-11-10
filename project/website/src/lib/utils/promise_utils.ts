import { browser } from "$app/environment";

export class NotOnClient {}

export class ClientPromise<P extends Promise<any>> {
  private _promise: () => P;

  constructor(promise: () => P) {
    this._promise = promise;
  }

  async resolve(): Promise<Awaited<P> | NotOnClient> {
    if (!browser) return new NotOnClient();

    return await this._promise();
  }

  get resolver(): ReturnType<typeof this.resolve> {
    return this.resolve();
  }

  else(v: Awaited<P>): InfallibleClientPromise<P> {
    return new InfallibleClientPromise(this._promise, v);
  }
}

class InfallibleClientPromise<P extends Promise<any>> extends ClientPromise<P> {
  private else_: Awaited<P>;

  constructor(promise: () => P, else_: Awaited<P>) {
    super(promise);

    this.else_ = else_;
  }

  override resolve(): Promise<Awaited<P>> {
    try {
      const original = super.resolve();
      return original instanceof NotOnClient ? this.else_ : original;
    } catch (e) {
      console.error(`InfallibleClientPromise error log\n\n${e}`);
      return this.else_;
    }
  }

  override get resolver(): Promise<Awaited<P>> {
    return this.resolve();
  }
}
