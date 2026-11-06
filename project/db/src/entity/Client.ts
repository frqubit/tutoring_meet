import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Deposit } from "./Deposit";
import { Student } from "./Student";

export type ClientCreateData = {
  name: string;
  active: boolean;
};

@Entity()
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  active: boolean;

  @Column({ nullable: true })
  tz?: string;

  @Column({ nullable: true })
  user_account?: string;

  @Column({ nullable: true })
  userpass?: string;

  @OneToMany(() => Deposit, (deposit) => deposit.client)
  deposits: Deposit[];

  @OneToMany(() => Student, (student) => student.client)
  students: Student[];

  public static create(data: ClientCreateData): Client {
    const client = new Client();
    client.name = data.name;
    client.active = data.active;
    client.user_account = undefined;
    client.tz = undefined;
    client.userpass = undefined;
    return client;
  }
}
