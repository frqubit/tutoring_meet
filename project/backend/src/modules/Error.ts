export const NodeError = Error;

export type Error = {
  error: 'error';
  message: string;
};

export function gen_error(message: string): Error {
  return {
    error: 'error',
    message,
  };
}
