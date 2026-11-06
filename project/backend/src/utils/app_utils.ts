import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../modules/auth/Auth.module';
import { ClientModule } from '../modules/client/Client.module';
import { DepositModule } from '../modules/deposit/Deposit.module';
import { SessionModule } from '../modules/session/Session.module';
import { StudentModule } from '../modules/student/Student.module';
import { WebDataModule } from '../modules/webdata/WebData.module';
import { MORE_ENV_FILE } from '../config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deposit } from '../entities/Deposit';
import { Session } from '../entities/Session';
import { Student } from '../entities/Student';
import { MmSessionStudent } from '../entities/MmSessionStudent';
import { Client } from '../entities/Client';
import { MeetModule } from '../modules/meet/Meet.module';

const APP_MODULES = [
  StudentModule,
  WebDataModule,
  DepositModule,
  SessionModule,
  ClientModule,
  AuthModule,
  MeetModule,
];

const ENV_MODULE = ConfigModule.forRoot({
  envFilePath: ['.env', '.env.cognito', MORE_ENV_FILE],
});

export function db_module(database: string) {
  return TypeOrmModule.forRoot({
    type: 'sqlite',
    database,
    entities: [Deposit, Session, Student, MmSessionStudent, Client],
  });
}

const DB_MODULE = () => db_module('db.sql');

export const ROOT_MODULE_IMPORTS_NODB = [...APP_MODULES, ENV_MODULE];
export const ROOT_MODULE_IMPORTS = () => [
  ...ROOT_MODULE_IMPORTS_NODB,
  DB_MODULE(),
];
