import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class ClientV1_1783099751854 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "client" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL,
        "active" boolean NOT NULL
      )`,
    );

    await queryRunner.query(
      `INSERT INTO "client" ("id", "name", "active")
        SELECT "id", "name", "active" FROM "student"
      `,
    );

    await queryRunner.query(
      `UPDATE "client" SET name = name || " (default parent)"`,
    );

    await queryRunner.query(
      `CREATE TABLE "temporary_deposit" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "date" datetime NOT NULL DEFAULT (datetime('now')),
        "cents" integer NOT NULL,
        "clientId" integer NOT NULL,
        CONSTRAINT "FK_bb8cc1953f4b97c61b8138ccf12" FOREIGN KEY("clientId") REFERENCES "client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )`,
    );

    await queryRunner.query(
      `INSERT INTO "temporary_deposit" ("id", "date", "cents", "clientId")
        SELECT "id", "date", "cents", "studentId" "clientId" FROM "deposit"
      `,
    );

    await queryRunner.query(`DROP TABLE "deposit"`);

    await queryRunner.query(
      `ALTER TABLE "temporary_deposit" RENAME TO "deposit"`,
    );

    await queryRunner.query(
      `CREATE TABLE "temporary_student" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL,
        "active" boolean NOT NULL,
        "clientId" integer NOT NULL,
        CONSTRAINT "FK_cb8cc1953f4b97c61b8138ccf12" FOREIGN KEY("clientId") REFERENCES "client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )`,
    );

    await queryRunner.query(
      `INSERT INTO "temporary_student" ("id", "name", "active", "clientId")
        SELECT "id", "name", "active", "id" "clientId" FROM "student"
      `,
    );

    await queryRunner.query(`DROP TABLE "student"`);

    await queryRunner.query(
      `ALTER TABLE "temporary_student" RENAME TO "student"`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
