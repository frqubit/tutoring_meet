export type ValidJsonSafeHandlerFieldValue =
  | string
  | number
  | boolean
  | null
  | ValidJsonSafeHandlerFieldValue[]
  | { [k: string]: ValidJsonSafeHandlerFieldValue };

export type ValidJsonSafeHandlerData = ValidJsonSafeHandlerFieldValue;

export type ValidHandlerFieldValue =
  | string
  | number
  | boolean
  | null
  | ValidHandlerFieldValue[]
  | { [k: string]: ValidHandlerFieldValue }
  | Date;

export type ValidHandlerData = ValidHandlerFieldValue;

type ChangeKeyTypeObject<T extends Record<string, unknown>, Type, NewType> = {
  [Key in keyof T]: ChangeKeyType<T[Key], Type, NewType>;
};

type ChangeKeyType<T, Type, NewType> = T extends Type
  ? NewType
  : // : T extends Type[] ? NewType[]
    T extends (infer U)[]
    ? ChangeKeyType<U, Type, NewType>[]
    : T extends Record<string, unknown>
      ? ChangeKeyTypeObject<T, Type, NewType>
      : T;

type JsonSafe1<D extends ValidHandlerData> = ChangeKeyType<D, Date, string>;

export type JsonSafe<D extends ValidHandlerData> = JsonSafe1<D>;

export function enforce<T>(d: T) {
  return d;
}

export function map_object_values<T extends object, V>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => V,
): { [K in keyof T]: V } {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      fn(value as T[keyof T], key as keyof T),
    ]),
  ) as { [K in keyof T]: V };
}

export type OptionalIfUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

export type LastElement<T extends readonly unknown[]> = T extends readonly [
  ...unknown[],
  infer Last,
]
  ? Last
  : never;
