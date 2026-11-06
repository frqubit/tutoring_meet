import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Student } from './Student';
import { Session } from './Session';

export type MmSessionStudentCreateData = {
  student: Student;
  session: Session;
};

@Entity('mm_session_student')
export class MmSessionStudent {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => Student, (student) => student.sessions_r)
  public student: Student;

  @ManyToOne(() => Session, (session) => session.students_r)
  public session: Session;

  public static create(data: MmSessionStudentCreateData): MmSessionStudent {
    const mmSessionStudent = new MmSessionStudent();
    mmSessionStudent.student = data.student;
    mmSessionStudent.session = data.session;

    return mmSessionStudent;
  }
}
