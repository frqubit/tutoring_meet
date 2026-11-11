import { DeFailure, SerFailure, Serde, gen_serde } from './serde_utils';

export class ConstantValue<N extends number> {
  _code: N;

  constructor(code: N) {
    this._code = code;
  }

  get code(): N {
    return this._code;
  }

  serde(): Serde<ConstantValue<N>> {
    return gen_serde(
      (v) => {
        if (v instanceof ConstantValue && v.code == this._code)
          return `%C?${this._code}`;

        return new SerFailure('Not specified constant');
      },
      (v) => {
        if (v === `%C?${this._code}`) return new ConstantValue(this._code);

        return new DeFailure('Not specified constant');
      },
    );
  }

  matches(v: any): v is ConstantValue<N> {
    if (!(v instanceof ConstantValue)) return false;
    if (v._code == this._code) return true;

    return false;
  }
}

export const C_MYSELF = new ConstantValue(0xff00_0001);
