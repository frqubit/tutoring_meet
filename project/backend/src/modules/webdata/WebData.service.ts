import { SerdeT, Serde, SerFailure, DeFailure } from '@/src/utils/serde_utils';
import { Injectable, Logger, Module } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3_BASE_PATH, S3_BUCKET } from '@/src/config';
import { Error, gen_error } from '../Error';

@Injectable()
export class WebDataService {
  private s3_client: S3Client;
  private logger: Logger = new Logger('WebData');

  constructor() {
    this.s3_client = new S3Client({
      useDualstackEndpoint: true,
    });
  }

  async saveSerdeToFile<T extends Serde<any>>(
    serde: T,
    key: string,
    value: SerdeT<T>,
  ): Promise<null | Error> {
    const serialized = serde.ser(value);
    if (serialized instanceof SerFailure)
      return gen_error(`cannot serialize requested to file`);

    const write_request = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${S3_BASE_PATH}${key}`,
      Body: serialized,
    });

    try {
      await this.s3_client.send(write_request);
    } catch (e) {
      return gen_error(e);
    }

    return null;
  }

  async saveBufferToFile(key: string, value: Buffer): Promise<null | Error> {
    const write_request = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${S3_BASE_PATH}${key}`,
      Body: value,
    });

    try {
      await this.s3_client.send(write_request);
    } catch (e) {
      return gen_error(e);
    }

    return null;
  }

  async readSerdeFromFile<T extends Serde<any>>(
    serde: T,
    key: string,
  ): Promise<SerdeT<T> | Error> {
    const read_request = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${S3_BASE_PATH}${key}`,
    });

    try {
      const resp = await this.s3_client.send(read_request);
      const data = await resp.Body?.transformToString();

      if (data === undefined) {
        return gen_error('Object does not exist');
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const serres = serde.de(data);
        if (serres instanceof DeFailure)
          return gen_error(`cannot deserialized file key as requested serde`);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return serres;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        return gen_error('Object was not of serde type');
      }
    } catch (e) {
      return gen_error(e);
    }
  }

  async readBufferFromFile(key: string): Promise<Buffer | Error> {
    const read_request = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${S3_BASE_PATH}${key}`,
    });

    try {
      const resp = await this.s3_client.send(read_request);
      const data = await resp.Body?.transformToByteArray();

      if (data === undefined) {
        return gen_error('Object does not exist');
      }

      return Buffer.from(data);
    } catch (e) {
      return gen_error(e);
    }
  }
}

@Module({
  imports: [],
  providers: [WebDataService],
  exports: [WebDataService],
})
export class WebDataServiceModule {}
