import { Deposit } from '@/src/entities/Deposit';
import { Client, ClientCreateData } from '@/src/entities/Client';
import { Injectable, Logger, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Error, gen_error } from '../Error';
import { Student } from '@/src/entities/Student';
import { Request } from 'express';
import { AuthProblem } from '@/src/utils/auth_utils';
import { AuthService, AuthServiceModule } from '../auth/Auth.service';

@Injectable()
export class ClientService {
  private logger: Logger = new Logger('ClientService');

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    private readonly authService: AuthService,
  ) {}

  create(data: ClientCreateData): Promise<Client> {
    return this.clientRepository.save(Client.create(data));
  }

  async remove(id: number): Promise<void> {
    await this.clientRepository.delete(id);
  }

  findAll(): Promise<Client[]> {
    return this.clientRepository.find();
  }

  findOne(id: number): Promise<Client | null> {
    return this.clientRepository.findOneBy({ id });
  }

  findOneByUsername(username: string): Promise<Client | null> {
    return this.clientRepository.findOneBy({ user_account: username });
  }

  async findOneOfTokens(req: Request): Promise<Client | null> {
    const authTkn = await this.authService.getAuthToken(req);

    if (authTkn instanceof AuthProblem) return null;

    if (authTkn.user?.userid) return this.findOne(authTkn.user.userid);

    return null;
  }

  async toggleActive(id: number): Promise<Client | null> {
    const client = await this.findOne(id);
    if (client == null) return null;

    client.active = !client.active;
    return this.clientRepository.save(client);
  }

  async rename(id: number, new_name: string): Promise<Client | Error> {
    const client = await this.findOne(id);
    if (client == null) {
      return gen_error('Client does not exist');
    }

    if (!client.active) {
      return gen_error('Client must not be inactive');
    }

    client.name = new_name;
    await this.clientRepository.save(client);

    return client;
  }

  async merge_into(to_delete: number, to_go_to: number) {
    if (to_delete == to_go_to) {
      return gen_error('source and target must be different');
    }

    const client_to_delete = await this.clientRepository.findOne({
      where: { id: to_delete },
      relations: { deposits: true, students: true },
    });

    const client_to_go_to = await this.clientRepository.findOne({
      where: { id: to_go_to },
      relations: { deposits: true, students: true },
    });

    if (!client_to_delete || !client_to_go_to) {
      return gen_error("One or both clients don't exist");
    }

    if (!client_to_delete.active || !client_to_go_to.active) {
      return gen_error('One or both clients is inactive');
    }

    for (const student of client_to_delete.students) {
      student.client = client_to_go_to;
      await this.studentRepository.save(student);
    }

    for (const deposit of client_to_delete.deposits) {
      deposit.client = client_to_go_to;
      await this.depositRepository.save(deposit);
    }

    await this.clientRepository.remove(client_to_delete);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Deposit, Student]),
    AuthServiceModule,
  ],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientServiceModule {}
