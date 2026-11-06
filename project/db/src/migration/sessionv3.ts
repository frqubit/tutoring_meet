import { MigrationInterface, QueryRunner } from "typeorm";

export class SessionV3_1774016734898 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session" RENAME COLUMN "weeks" to "occurrences"`,
    );

    await queryRunner.query(
      `ALTER TABLE "session" ADD "every" integer NOT NULL DEFAULT 1`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
