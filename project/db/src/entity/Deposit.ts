import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Student } from "./Student";
import { Client } from "./Client";

export type DepositCreateData = {
  client: Client;
  date: Date;
  cents: number;
};

@Entity()
export class Deposit {
  @PrimaryGeneratedColumn()
  id: number;

  // @ManyToOne(() => Student, (student) => student.deposits)
  // student: Student;

  @ManyToOne(() => Client, (client) => client.deposits)
  client: Client;

  @CreateDateColumn()
  date: Date;

  @Column()
  cents: number;

  public static create(data: DepositCreateData): Deposit {
    const deposit = new Deposit();
    deposit.client = data.client;
    deposit.date = data.date;
    deposit.cents = data.cents;
    return deposit;
  }
}
