import { MigrationInterface, QueryRunner } from "typeorm";

export class SessionV5_1779123328000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE session SET date = datetime(date, '+4 hours')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
