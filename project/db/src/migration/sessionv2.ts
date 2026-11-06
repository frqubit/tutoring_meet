import { MigrationInterface, QueryRunner } from "typeorm";

export class SessionV2_1771530523898 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session" ADD "weeks" integer NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE "session" ADD "completed" boolean NOT NULL DEFAULT 1`,
    );

    await queryRunner.query(
      `ALTER TABLE "session" ADD "legacy" boolean NOT NULL DEFAULT 1`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
