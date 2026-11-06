import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Deposit } from './Deposit';
import { Session } from './Session';
import { MmSessionStudent } from './MmSessionStudent';
import { Client } from './Client';

export type StudentCreateData = {
  name: string;
  active: boolean;
  client: Client;
};

@Entity()
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  active: boolean;

  @ManyToOne(() => Client, (client) => client.students)
  client: Client;

  @OneToMany(
    () => MmSessionStudent,
    (mmSessionStudent) => mmSessionStudent.student,
  )
  sessions_r: MmSessionStudent[];

  public static create(data: StudentCreateData): Student {
    const student = new Student();
    student.name = data.name;
    student.active = data.active;
    student.client = data.client;
    return student;
  }
}
