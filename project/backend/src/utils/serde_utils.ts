import { start } from 'node:repl';
import { type Error } from '../modules/Error';
import { Logger } from '@nestjs/common';

export interface Serde<T> {
  ser: (v: T) => string | SerFailure;
  de: (v: string) => T | DeFailure;
}

export type SerdeT<S extends Serde<any>> = S extends Serde<infer T> ? T : never;

export type MappedToSerde<T> = {
  [Key in keyof T]: Serde<T[Key]>;
};

export type UnmappedFromSerde<T> = {
  [Key in keyof T]: T[Key] extends Serde<infer U> ? U : never;
};

export function gen_serde<T>(
  ser: (v: T) => string | SerFailure,
  de: (v: string) => T | DeFailure,
): Serde<T> {
  return {
    ser,
    de,
  };
}

export const BuiltinSerdeType = gen_builtin_serde_type();

function gen_builtin_serde_type() {
  const start_type = {
    void: gen_serde<void>(
      (_v) => '',
      (_v) => undefined,
    ),
    number: gen_serde<number>(
      (v) =>
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        typeof v === 'number' ? `n${v}` : new SerFailure(`not a number: ${v}`),
      (v) =>
        v.startsWith('n') ? +v.slice(1) : new DeFailure(`not a number: ${v}`),
    ),
    string: gen_serde<string>(
      (v) =>
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        typeof v === 'string' ? `s${v}` : new SerFailure(`not a string: ${v}`),
      (v) =>
        v.startsWith('s') ? v.slice(1) : new DeFailure(`not a string: ${v}`),
    ),
    boolean: gen_serde<boolean>(
      (v) =>
        typeof v === 'boolean'
          ? `b${v}`
          : // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            new SerFailure(`not a boolean: ${v}`),
      (v) =>
        v.startsWith('b')
          ? v.slice(1) == 'true'
          : new DeFailure(`not a boolean: ${v}`),
    ),
    date: gen_serde<Date>(
      (v) =>
        v instanceof Date
          ? `D${v.toISOString()}`
          : // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            new SerFailure(`not a date: ${v}`),
      (v) =>
        v.startsWith('D')
          ? new Date(v.slice(1))
          : new DeFailure(`not a date: ${v}`),
    ),
    fallible: <T extends Serde<any>>(t: T) =>
      gen_serde<SerdeT<T> | Error>(
        (v) => {
          if (typeof v === 'object' && 'error' in v) {
            return `err${v.message}`;
          } else {
            const res = t.ser(v);
            if (res instanceof SerFailure) return res;

            return `ok${res}`;
          }
        },
        (v) => {
          if (v.startsWith('err')) {
            return {
              error: 'error',
              message: v.slice(3),
            };
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return t.de(v.slice(2)) as SerdeT<T>;
          }
        },
      ),
    nullable: <T extends Serde<any>>(t: T) =>
      gen_serde<SerdeT<T> | null>(
        (v) => {
          if (v === null) {
            return `null`;
          } else {
            const res = t.ser(v);
            if (res instanceof SerFailure) return res;

            return `smth${res}`;
          }
        },
        (v) => {
          if (v == 'null') {
            return null;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return t.de(v.slice(4));
          }
        },
      ),
    optional: <T extends Serde<any>>(t: T) =>
      gen_serde<SerdeT<T> | undefined>(
        (v) => {
          if (v === undefined) {
            return 'U';
          } else {
            const res = t.ser(v);
            if (res instanceof SerFailure) return res;

            return `smth${res}`;
          }
        },
        (v) => {
          if (v === 'U') {
            return undefined;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return t.de(v.slice(4));
          }
        },
      ),
    error: gen_serde<Error>(
      (v) =>
        'error' in v
          ? `err${v.message}`
          : // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            new SerFailure(`not an error: ${v}`),
      (v) =>
        v.startsWith('err')
          ? { error: 'error', message: v.slice(3) }
          : new DeFailure(`not an error: ${v}`),
    ),
    array: <T extends Serde<any>>(t: T) =>
      gen_serde<SerdeT<T>[]>(
        (v) => {
          const out_vals: string[] = [];
          for (const val of v) {
            const res = t.ser(val);
            if (res instanceof SerFailure) return res;
            out_vals.push(res);
          }
          return `[]${JSON.stringify(out_vals)}`;
        },
        (v) => {
          if (!v.startsWith('[]')) return new DeFailure(`not an array: ${v}`);

          const parsed = JSON.parse(v.slice(2)) as string[];
          const out_vals: SerdeT<T>[] = [];
          for (const val of parsed) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const res = t.de(val);
            if (res instanceof DeFailure) return res;
            out_vals.push(res);
          }
          return out_vals;
        },
      ),
    object: <T extends MappedToSerde<V>, V extends object>(t: T) => {
      const keys = Object.keys(t).toSorted();

      return gen_serde<UnmappedFromSerde<T>>(
        (v) => {
          const out_vals: string[] = [];
          for (const key of keys) {
            const res = t[key as keyof T].ser(v[key]);
            if (res instanceof SerFailure)
              return new SerFailure(
                `cannot serialize key ${key}: ${res.reason}`,
              );

            out_vals.push(res);
          }
          return `{}${JSON.stringify(out_vals)}`;
        },
        (v) => {
          if (!v.startsWith('{}')) return new DeFailure(`not an object: ${v}`);

          const parsed = JSON.parse(v.slice(2)) as string[];
          const entries: [keyof T, any][] = [];
          for (let i = 0; i < parsed.length; i++) {
            const res = t[keys[i] as keyof T].de(parsed[i]);
            if (res instanceof DeFailure) return res;

            entries.push([keys[i] as keyof T, res]);
          }

          return Object.fromEntries(entries) as UnmappedFromSerde<T>;
        },
      );
    },
    a_or_b: <A extends Serde<any>, B extends Serde<any>>(a: A, b: B) => {
      return gen_serde<SerdeT<A> | SerdeT<B>>(
        (v) => {
          const resA = a.ser(v);
          if (!(resA instanceof SerFailure)) return `A${resA}`;
          const resB = b.ser(v);
          if (!(resB instanceof SerFailure)) return `B${resB}`;
          return new SerFailure(`not either valid option a or b: ${v}`);
        },
        (v) => {
          if (v.startsWith('A')) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return a.de(v.slice(1));
          } else if (v.startsWith('B')) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return b.de(v.slice(1));
          } else {
            return new DeFailure(`not an ab split: ${v}`);
          }
        },
      );
    },
    enum: <E extends Record<string, string>>(en: E) => {
      return gen_serde<E[keyof E]>(
        (v) => {
          if (Object.values(en).indexOf(v) != -1) return `en${v}`;

          return new SerFailure(`${v} is not in enum`);
        },
        (v) => {
          if (v.startsWith('en')) {
            return v.slice(2) as E[keyof E];
          } else {
            return new DeFailure(`${v} is not an enum`);
          }
        },
      );
    },
    uint8array: (() => {
      const abc =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

      return gen_serde<Uint8Array>(
        (v) => {
          if (!(v instanceof Uint8Array))
            return new SerFailure(`not a uint8array: ${typeof v}`);

          const len = v.length;
          let result = '';

          for (let i = 0; i < len; i += 3) {
            const b1 = v[i];
            const b2 = i + 1 < len ? v[i + 1] : NaN;
            const b3 = i + 2 < len ? v[i + 2] : NaN;

            const c1 = b1 >> 2;
            const c2 = ((b1 & 3) << 4) | (Number.isNaN(b2) ? 0 : b2 >> 4);
            const c3 = Number.isNaN(b2)
              ? NaN
              : ((b2 & 15) << 2) | (Number.isNaN(b3) ? 0 : b3 >> 6);
            const c4 = Number.isNaN(b3) ? NaN : b3 & 63;

            result +=
              abc[c1] +
              abc[c2] +
              (Number.isNaN(c3) ? '=' : abc[c3]) +
              (Number.isNaN(c4) ? '=' : abc[c4]);
          }

          return `u8]${result}`;
        },
        (v) => {
          if (!v.startsWith('u8]'))
            return new DeFailure(`not a uint8array: ${v}`);

          const b64 = v.slice(3);
          const lookup = new Uint8Array(256);
          for (let i = 0; i < abc.length; i++) {
            lookup[abc.charCodeAt(i)] = i;
          }

          let bufferLength = b64.length * 0.75;
          if (b64.endsWith('==')) {
            bufferLength -= 2;
          } else if (b64.endsWith('=')) {
            bufferLength -= 1;
          }

          const bytes = new Uint8Array(bufferLength);
          let pos = 0;

          for (let i = 0; i < b64.length; i += 4) {
            const c1 = lookup[b64.charCodeAt(i)];
            const c2 = lookup[b64.charCodeAt(i + 1)];
            const c3 = lookup[b64.charCodeAt(i + 2)];
            const c4 = lookup[b64.charCodeAt(i + 3)];

            const combined = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;

            if (pos < bufferLength) bytes[pos++] = (combined >> 16) & 255;
            if (pos < bufferLength) bytes[pos++] = (combined >> 8) & 255;
            if (pos < bufferLength) bytes[pos++] = combined & 255;
          }

          return bytes;
        },
      );
    })(),
    constant: <V extends number | string | boolean>(constant_val: V) => {
      return gen_serde<V>(
        (v) => {
          if (v !== constant_val) {
            return new SerFailure('is not expected constant value');
          }

          switch (typeof constant_val) {
            case 'string':
              return `%Cs!${constant_val}`;
            case 'number':
              return `%Cn!${constant_val}`;
            case 'boolean':
              return constant_val ? `%Ct!` : `%Cf!`;
          }
        },
        (v) => {
          if (!v.startsWith('%C')) return new DeFailure('Not a constant');

          if (typeof constant_val === 'string') {
            if (!v.startsWith('%Cs!'))
              return new DeFailure('Not expected constant, wanted string');

            const val = v.slice(4);
            if (val !== constant_val)
              return new DeFailure(
                'Not expected constant, wanted different string',
              );

            return constant_val;
          } else if (typeof constant_val === 'number') {
            if (!v.startsWith('%Cn!'))
              return new DeFailure('Not expected constant, wanted number');

            const val = v.slice(4);
            if (val !== `${constant_val}`)
              return new DeFailure(
                'Not expected constant, wanted different number',
              );

            return constant_val;
          }

          if (constant_val && v === '%Ct!') {
            return constant_val;
          } else if (v === '%Cf!') {
            return constant_val;
          } else {
            return new DeFailure(
              'Not expected constant, wanted different boolean',
            );
          }
        },
      );
    },
  };

  const versionable_object = <T extends MappedToSerde<V>, V extends object>(
    t: T,
  ) => {
    const keys = Object.keys(t);
    const obj_serde = start_type.object(t);

    return gen_serde<UnmappedFromSerde<T>>(
      (v) => {
        const v_keys = Object.keys(v);
        if (v_keys.length !== keys.length) {
          return new SerFailure(
            `Versionable object requires keys to match identically: expected ${keys.length}, got ${v_keys.length}`,
          );
        }

        return obj_serde.ser(v);
      },
      (v) => {
        if (!v.startsWith('{}')) return new DeFailure(`not an object: ${v}`);

        const parsed = JSON.parse(v.slice(2)) as string[];
        if (parsed.length !== keys.length)
          return new DeFailure(
            `Versionable object requires keys to match identically: expected ${keys.length}, got ${parsed.length}`,
          );

        return obj_serde.de(v);
      },
    );
  };

  const versioned = <T extends readonly Serde<any>[]>(ents: T) => {
    return gen_serde<SerdeT<T[number]>>(
      (v) => {
        // Latest version first
        for (let i = ents.length - 1; i >= 0; i--) {
          const res = ents[i].ser(v);
          if (!(res instanceof SerFailure)) return `${i}#${res}`;
        }
        return new SerFailure('No version successfully serialized');
      },
      (v) => {
        const splits = v.split('#', 2);
        if (splits.length != 2)
          return new DeFailure(`Not a versioned string: ${v}`);
        const version = Number.parseInt(splits[0]);
        if (version < 0 || version >= ents.length)
          return new DeFailure('Invalid version number for string');

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return ents[version].de(splits[1]);
      },
    );
  };

  return {
    ...start_type,
    versionable_object,
    versioned,
  };
}

export class SerFailure {
  private _reason: string;

  public constructor(reason: string) {
    this._reason = reason;
  }

  public get reason(): string {
    return this._reason;
  }

  public toString(): string {
    return `Serde failed to serialize: ${this._reason}`;
  }
}

export class DeFailure {
  private _reason: string;

  public constructor(reason: string) {
    this._reason = reason;
  }

  public get reason(): string {
    return this._reason;
  }

  public toString(): string {
    return `Serde failed to deserialize: ${this._reason}`;
  }
}
