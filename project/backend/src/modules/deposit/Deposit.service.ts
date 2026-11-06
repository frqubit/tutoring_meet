import { Deposit } from '@/src/entities/Deposit';
import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Error, gen_error } from '../Error';
import { Student } from '@/src/entities/Student';
import { ClientService, ClientServiceModule } from '../client/Client.service';

type DepositServiceCreateData = {
  client_id: number;
  date: Date;
  cents: number;
};

@Injectable()
export class DepositService {
  constructor(
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    private clientService: ClientService,
  ) {}

  async create(data: DepositServiceCreateData): Promise<Deposit | Error> {
    const client = await this.clientService.findOne(data.client_id);

    if (client === null) {
      return gen_error("This client doesn't exist!");
    }

    if (!client.active) {
      return gen_error('Client must not be inactive');
    }

    return this.depositRepository.save(
      Deposit.create({
        ...data,
        client,
      }),
    );
  }

  async remove(id: number): Promise<void> {
    await this.depositRepository.delete(id);
  }

  findAll(): Promise<Deposit[]> {
    return this.depositRepository.find({
      relations: { client: true },
    });
  }

  findOne(id: number): Promise<Deposit | null> {
    return this.depositRepository.findOne({
      relations: { client: true },
      where: {
        id,
      },
    });
  }

  findAllOfClient(client_id: number): Promise<Deposit[]> {
    return this.depositRepository.findBy({ client: { id: client_id } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Deposit, Student]), ClientServiceModule],
  providers: [DepositService],
  exports: [DepositService],
})
export class DepositServiceModule {}
