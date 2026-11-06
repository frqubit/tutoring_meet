import { Delete, Get, Patch, Post } from '@nestjs/common';
import { HandlerInfo } from './handler_utils';

export function Decorate(handler: HandlerInfo<any, any, any>): MethodDecorator {
  if (handler.call_variant === 'GET') {
    return Get(handler.path());
  } else if (handler.call_variant === 'DELETE') {
    return Delete(handler.path());
  } else if (handler.call_variant === 'PATCH') {
    return Patch(handler.path());
  } else {
    return Post(handler.path());
  }
}
