import { MigrationInterface, QueryRunner } from "typeorm";

export class SessionV4_1778169398000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session" ADD COLUMN "ends" datetime DEFAULT NULL`,
    );

    await queryRunner.query(
      `UPDATE session SET ends = datetime(date, '+' || (7 * (occurrences - 1) * every) || ' days') WHERE occurrences NOT IN (0, 1)`,
    );

    await queryRunner.query(
      `UPDATE session SET every = 0 WHERE occurrences = 0`,
    );

    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "occurrences"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
