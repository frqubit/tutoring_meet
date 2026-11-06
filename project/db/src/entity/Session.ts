import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { Student } from "./Student";
import { MmSessionStudent } from "./MmSessionStudent";
import { SessionCompletion } from "./Session.enum";
export { SessionCompletion } from "./Session.enum";

export type SessionCreateData = {
  date: Date;
  minutes: number;
  completed: SessionCompletion;
  every: number;
  ends?: Date | null;
};

@Entity()
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(
    () => MmSessionStudent,
    (mmSessionStudent) => mmSessionStudent.session,
  )
  students_r: MmSessionStudent[];

  public get students(): Student[] {
    return this.students_r.map((sr) => sr.student);
  }

  @CreateDateColumn()
  date: Date;

  @Column()
  minutes: number;

  @Column({ nullable: true, type: "datetime" })
  ends: Date | null;

  // @Column()
  // completed: boolean;

  @Column({
    type: "text",
    enum: SessionCompletion,
    default: SessionCompletion.NONE,
  })
  completed: SessionCompletion;

  @Column()
  legacy: boolean;

  @Column()
  every: number;

  index: number = 0;

  public static create(data: SessionCreateData): Session {
    const session = new Session();
    session.date = data.date;
    session.minutes = data.minutes;
    session.ends = data.ends || null;
    session.completed = data.completed;
    session.legacy = false;
    session.every = data.every;
    session.students_r = [];

    return session;
  }
}
