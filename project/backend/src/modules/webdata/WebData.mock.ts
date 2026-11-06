import { DeFailure, Serde, SerdeT, SerFailure } from '@/src/utils/serde_utils';
import { Error, gen_error } from '../Error';
import { S3_BASE_PATH } from '@/src/config';

export class MockWebDataService {
  private _storage: Record<string, string | Buffer> = {};

  public saveSerdeToFile<T extends Serde<any>>(
    serde: T,
    key: string,
    value: SerdeT<T>,
  ): null | Error {
    const serialized = serde.ser(value);
    if (serialized instanceof SerFailure)
      return gen_error(`cannot serialize requested to file`);

    this._storage[`${S3_BASE_PATH}/${key}`] = serialized;

    return null;
  }

  public saveBufferToFile(key: string, value: Buffer): null | Error {
    this._storage[`${S3_BASE_PATH}/${key}`] = value;

    return null;
  }

  public readSerdeFromFile<T extends Serde<any>>(
    serde: T,
    key: string,
  ): SerdeT<T> | Error {
    const val = this._storage[`${S3_BASE_PATH}/${key}`];
    if (!(typeof val == 'string')) return gen_error(`does not contain string`);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const serres = serde.de(val);
      if (serres instanceof DeFailure)
        return gen_error(`cannot deserialized file key as requested serde`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return serres;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return gen_error('Object was not of serde type');
    }
  }

  public readBufferFromFile(key: string): Buffer | Error {
    const val = this._storage[`${S3_BASE_PATH}/${key}`];
    if (typeof val == 'string') return gen_error(`does not contain string`);

    return val;
  }
}
