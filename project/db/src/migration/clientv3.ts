import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class ClientV3_1792809705000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client" ADD "tz" varchar DEFAULT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "client" ADD "userpass" varchar DEFAULT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
