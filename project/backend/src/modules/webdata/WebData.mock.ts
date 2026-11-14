import { DeFailure, Serde, SerdeT, SerFailure } from '@/src/utils/serde_utils';
import { Error, gen_error } from '../Error';
import { S3_BASE_PATH } from '@/src/config';

export class MockWebDataService {
  private _storage: Record<string, string | Buffer> = {};

  // eslint-disable-next-line @typescript-eslint/require-await
  public async saveSerdeToFile<T extends Serde<any>>(
    serde: T,
    key: string,
    value: SerdeT<T>,
  ): Promise<null | Error> {
    const serialized = serde.ser(value);
    if (serialized instanceof SerFailure)
      return gen_error(`cannot serialize requested to file`);

    this._storage[`${S3_BASE_PATH}/${key}`] = serialized;

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async saveBufferToFile(
    key: string,
    value: Buffer,
  ): Promise<null | Error> {
    this._storage[`${S3_BASE_PATH}/${key}`] = value;

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async readSerdeFromFile<T extends Serde<any>>(
    serde: T,
    key: string,
  ): Promise<SerdeT<T> | Error> {
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

  // eslint-disable-next-line @typescript-eslint/require-await
  public async readBufferFromFile(key: string): Promise<Buffer | Error> {
    const val = this._storage[`${S3_BASE_PATH}/${key}`];
    if (typeof val == 'string') return gen_error(`does not contain string`);

    return val;
  }
}
