import "reflect-metadata";
import { DataSource } from "typeorm";
import { Student } from "./entity/Student";
import { Deposit } from "./entity/Deposit";
import { Session } from "./entity/Session";
import MIGRATIONS from "./migration";
import { MmSessionStudent } from "./entity/MmSessionStudent";
import { Client } from "./entity/Client";

export const Entities = [Student, Deposit, Session, MmSessionStudent, Client];

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "db.sql",
  entities: Entities,
  synchronize: true,
  migrations: MIGRATIONS,
});
