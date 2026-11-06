import { Deposit } from '@/src/entities/Deposit';
import { Student } from '@/src/entities/Student';
import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientService, ClientServiceModule } from '../client/Client.service';
import { gen_error, type Error } from '../Error';
import {
  WebDataService,
  WebDataServiceModule,
} from '../webdata/WebData.service';
import {
  AnyVersion as AnyStudentNoteVersion,
  LatestFormat as LatestStudentNoteFormat,
  LatestVersion as LatestStudentNoteVersion,
} from '@/src/webdata/student_note';

type StudentServiceCreateData = {
  name: string;
  active: boolean;
  client_id: number;
};

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private clientService: ClientService,
    private webdataService: WebDataService,
  ) {}

  async create(data: StudentServiceCreateData): Promise<Student | Error> {
    const client = await this.clientService.findOne(data.client_id);

    if (client === null) {
      return gen_error("This client doesn't exist!");
    }

    if (!client.active) {
      return gen_error('Client must not be inactive');
    }

    return this.studentRepository.save(
      Student.create({
        ...data,
        client,
      }),
    );
  }

  async rename(id: number, name: string): Promise<Student | Error> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: { client: true },
    });

    if (!student) {
      return gen_error('Student does not exist');
    }

    if (!student.active) {
      return gen_error('Student must be active to rename');
    }

    if (!student.client.active) {
      return gen_error("Student's client must be active to rename");
    }

    student.name = name;

    await this.studentRepository.save(student);

    return student;
  }

  async remove(id: number): Promise<void> {
    await this.studentRepository.delete(id);
  }

  findAll(): Promise<Student[]> {
    return this.studentRepository.find({
      relations: { client: true },
    });
  }

  findAllOfClient(clientId: number): Promise<Student[]> {
    return this.studentRepository.find({
      where: {
        client: {
          id: clientId,
        },
      },
      relations: { client: true },
    });
  }

  findOne(id: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { id },
      relations: { client: true },
    });
  }

  async toggleActive(id: number): Promise<Student | null> {
    const student = await this.findOne(id);
    if (student == null) return null;

    student.active = !student.active;
    return this.studentRepository.save(student);
  }

  async loadStudentNote(id: number): Promise<Error | LatestStudentNoteFormat> {
    const student = await this.findOne(id);
    if (student == null) return gen_error('student does not exist');

    const res = await this.webdataService.readSerdeFromFile(
      AnyStudentNoteVersion,
      `/student_note/${id}`,
    );

    if ('error' in res) return res;

    if (!('timezone' in res)) {
      return {
        ...res,
        timezone: 'NOT SET',
      };
    }

    return res;
  }

  async saveStudentNote(id: number, val: LatestStudentNoteFormat) {
    const student = await this.findOne(id);
    if (student == null) return gen_error('student does not exist');

    return await this.webdataService.saveSerdeToFile(
      AnyStudentNoteVersion,
      `/student_note/${id}`,
      val,
    );
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Deposit]),
    ClientServiceModule,
    WebDataServiceModule,
  ],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentServiceModule {}
