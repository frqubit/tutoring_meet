import { gen_error } from '../modules/Error';
import {
  BuiltinSerdeType,
  DeFailure,
  SerdeT,
  SerFailure,
} from '../utils/serde_utils';
import { test, expect, describe } from 'vitest';

test('number', () => {
  const samples = [12, -3, 5.5, -3.37, 1e12];
  const serde = BuiltinSerdeType.number;

  for (const value of samples) {
    const Sres = serde.ser(value);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(value);
  }
});

test('string', () => {
  const samples = ['damn this crazy', '1234', '', '"', '""', "'"];
  const serde = BuiltinSerdeType.string;

  for (const value of samples) {
    const Sres = serde.ser(value);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(value);
  }
});

test('boolean', () => {
  const samples = [true, false];
  const serde = BuiltinSerdeType.boolean;

  for (const value of samples) {
    const Sres = serde.ser(value);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(value);
  }
});

test('date', () => {
  const samples = [new Date(), new Date(0), new Date(Date.now() - 100)];
  const serde = BuiltinSerdeType.date;

  for (const value of samples) {
    const Sres = serde.ser(value);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(value);
  }
});

test('error', () => {
  const samples = [gen_error('ERROR'), gen_error('{"error":"ERROR"}')];
  const serde = BuiltinSerdeType.error;

  for (const value of samples) {
    const Sres = serde.ser(value);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(value);
  }
});

describe('nullable', () => {
  test('nullable string', () => {
    const samples = ['damn this crazy', '1234', '', '"', '""', "'", null];
    const serde = BuiltinSerdeType.nullable(BuiltinSerdeType.string);

    for (const value of samples) {
      const Sres = serde.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      const Dres = serde.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde>).toEqual(value);
    }
  });

  test('nullable number', () => {
    const samples = [12, -3, 5.5, -3.37, 1e12, null];
    const serde = BuiltinSerdeType.nullable(BuiltinSerdeType.number);

    for (const value of samples) {
      const Sres = serde.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      const Dres = serde.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde>).toEqual(value);
    }
  });
});

describe('fallible', () => {
  test('fallible string', () => {
    const samples = [
      'damn this crazy',
      '1234',
      '',
      '"',
      '""',
      "'",
      gen_error('ERROR'),
      gen_error('{"error":"ERROR"}'),
    ];
    const serde = BuiltinSerdeType.fallible(BuiltinSerdeType.string);

    for (const value of samples) {
      const Sres = serde.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      const Dres = serde.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde>).toEqual(value);
    }
  });

  test('fallible number', () => {
    const samples = [
      12,
      -3,
      5.5,
      -3.37,
      1e12,
      gen_error('ERROR'),
      gen_error('{"error":"ERROR"}'),
    ];
    const serde = BuiltinSerdeType.fallible(BuiltinSerdeType.number);

    for (const value of samples) {
      const Sres = serde.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      const Dres = serde.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde>).toEqual(value);
    }
  });
});

describe('array', () => {
  test('number', () => {
    const samples = [12, -3, 5.5, -3.37, 1e12];
    const serde = BuiltinSerdeType.array(BuiltinSerdeType.number);

    const Sres = serde.ser(samples);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(samples);
  });

  test('string', () => {
    const samples = ['damn this crazy', '1234', '', '"', '""', "'"];
    const serde = BuiltinSerdeType.array(BuiltinSerdeType.string);

    const Sres = serde.ser(samples);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(samples);
  });

  test('array with array symbols', () => {
    const samples = ['[damn this crazy]', '[[1234]', '[]][]', '"', '""', "'"];
    const serde = BuiltinSerdeType.array(BuiltinSerdeType.string);

    const Sres = serde.ser(samples);
    expect(Sres instanceof SerFailure).toBe(false);
    const Dres = serde.de(Sres as string);
    expect(Dres instanceof DeFailure).toBe(false);
    expect(Dres as SerdeT<typeof serde>).toEqual(samples);
  });
});

test('object', () => {
  const sample = {
    id: 1,
    name: 'ABC',
    logged_in: true,
    created_at: new Date(),
  };

  const serde = BuiltinSerdeType.object({
    id: BuiltinSerdeType.number,
    name: BuiltinSerdeType.string,
    logged_in: BuiltinSerdeType.boolean,
    created_at: BuiltinSerdeType.date,
  });

  const Sres = serde.ser(sample);
  expect(Sres instanceof SerFailure).toBe(false);
  const Dres = serde.de(Sres as string);
  expect(Dres instanceof DeFailure).toBe(false);
  expect(Dres as SerdeT<typeof serde>).toEqual(sample);
});

describe('a_or_b', () => {
  test('string or number', () => {
    const samples = [12, '12', 35, -12, 'hello'];
    const serde1 = BuiltinSerdeType.a_or_b(
      BuiltinSerdeType.string,
      BuiltinSerdeType.number,
    );

    const serde2 = BuiltinSerdeType.a_or_b(
      BuiltinSerdeType.number,
      BuiltinSerdeType.string,
    );

    for (const value of samples) {
      let Sres = serde1.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      let Dres = serde1.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde1>).toStrictEqual(value);

      Sres = serde2.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      Dres = serde2.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde2>).toStrictEqual(value);
    }
  });

  test('one array or another', () => {
    const samples = [
      [1, 2, 3, 4, 5],
      ['5', '4', '3', '2', '1', '0'],
    ];
    const serde1 = BuiltinSerdeType.a_or_b(
      BuiltinSerdeType.array(BuiltinSerdeType.string),
      BuiltinSerdeType.array(BuiltinSerdeType.number),
    );

    const serde2 = BuiltinSerdeType.a_or_b(
      BuiltinSerdeType.array(BuiltinSerdeType.string),
      BuiltinSerdeType.array(BuiltinSerdeType.number),
    );

    for (const value of samples) {
      let Sres = serde1.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      let Dres = serde1.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde1>).toStrictEqual(value);

      Sres = serde2.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      Dres = serde2.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde2>).toStrictEqual(value);
    }
  });

  test('one object or another', () => {
    const samples = [
      {
        name: 'John Doe',
        age: 12,
      },
      {
        name: 'John Doe',
        age: 30,
        occupation: 'Accountant',
      },
      {
        name: 'Jane Doe',
        age: 75,
        occupation: 'Driver',
      },
    ];
    const serde1 = BuiltinSerdeType.a_or_b(
      BuiltinSerdeType.versionable_object({
        name: BuiltinSerdeType.string,
        age: BuiltinSerdeType.number,
      }),
      BuiltinSerdeType.versionable_object({
        name: BuiltinSerdeType.string,
        age: BuiltinSerdeType.number,
        occupation: BuiltinSerdeType.string,
      }),
    );

    const serde2 = BuiltinSerdeType.a_or_b(
      BuiltinSerdeType.versionable_object({
        name: BuiltinSerdeType.string,
        age: BuiltinSerdeType.number,
        occupation: BuiltinSerdeType.string,
      }),
      BuiltinSerdeType.versionable_object({
        name: BuiltinSerdeType.string,
        age: BuiltinSerdeType.number,
      }),
    );

    for (const value of samples) {
      let Sres = serde1.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      let Dres = serde1.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde1>).toStrictEqual(value);

      Sres = serde2.ser(value);
      expect(Sres instanceof SerFailure).toBe(false);
      Dres = serde2.de(Sres as string);
      expect(Dres instanceof DeFailure).toBe(false);
      expect(Dres as SerdeT<typeof serde2>).toStrictEqual(value);
    }
  });
});
