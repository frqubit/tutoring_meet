import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class ClientV2_1791308810854 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client" ADD "user_account" varchar DEFAULT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
