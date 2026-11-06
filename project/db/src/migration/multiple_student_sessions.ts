import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class MultipleStudentSessions_1779284722000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_session" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" datetime NOT NULL DEFAULT (datetime('now')), "minutes" integer NOT NULL, "studentId" integer, "completed" boolean NOT NULL DEFAULT (1), "legacy" boolean NOT NULL DEFAULT (1), "every" integer NOT NULL DEFAULT (1), "ends" datetime DEFAULT (NULL))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_session"("id", "date", "minutes", "studentId", "completed", "legacy", "every", "ends") SELECT "id", "date", "minutes", "studentId", "completed", "legacy", "every", "ends" FROM "session"`,
    );
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_session" RENAME TO "session"`,
    );
    await queryRunner.query(
      `CREATE TABLE "mm_session_student" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "studentId" integer NOT NULL, "sessionId" integer NOT NULL)`,
    );
    await queryRunner.query(
      `
        INSERT INTO "mm_session_student" ("studentId", "sessionId")
        SELECT "studentId", "id" "sessionId"
        FROM "session"
      `,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_session" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" datetime NOT NULL DEFAULT (datetime('now')), "minutes" integer NOT NULL, "completed" boolean NOT NULL DEFAULT (1), "legacy" boolean NOT NULL DEFAULT (1), "every" integer NOT NULL DEFAULT (1), "ends" datetime DEFAULT (NULL))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_session"("id", "date", "minutes", "completed", "legacy", "every", "ends") SELECT "id", "date", "minutes", "completed", "legacy", "every", "ends" FROM "session"`,
    );
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_session" RENAME TO "session"`,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_session" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" datetime NOT NULL DEFAULT (datetime('now')), "minutes" integer NOT NULL, "completed" boolean NOT NULL, "legacy" boolean NOT NULL, "every" integer NOT NULL, "ends" datetime)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_session"("id", "date", "minutes", "completed", "legacy", "every", "ends") SELECT "id", "date", "minutes", "completed", "legacy", "every", "ends" FROM "session"`,
    );
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_session" RENAME TO "session"`,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_mm_session_student" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "studentId" integer NOT NULL, "sessionId" integer NOT NULL, CONSTRAINT "FK_82488a6e7e2a53fdaaad26571e7" FOREIGN KEY ("studentId") REFERENCES "student" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_c9bd9bf67a72936f8de532fb925" FOREIGN KEY ("sessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_mm_session_student"("id", "studentId", "sessionId") SELECT "id", "studentId", "sessionId" FROM "mm_session_student"`,
    );
    await queryRunner.query(`DROP TABLE "mm_session_student"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_mm_session_student" RENAME TO "mm_session_student"`,
    );

    // await queryRunner.query(
    //   `CREATE TABLE "mm_session_student" (
    //     "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    //     "studentId" integer NOT NULL,
    //     "sessionId" integer NOT NULL,
    //     CONSTRAINT "FK_82488a6e7e2a53fdaaad26571e7" FOREIGN KEY ("studentId") REFERENCES "student" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    //     CONSTRAINT "FK_c9bd9bf67a72936f8de532fb925" FOREIGN KEY ("sessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    //   )`,
    // );

    // await queryRunner.query(
    //   `
    //     INSERT INTO "mm_session_student" ("studentId", "sessionId")
    //     SELECT "studentId", "id" "sessionId"
    //     FROM "session"
    //   `,
    // );

    // await queryRunner.query(
    //   `ALTER TABLE "session" RENAME TO "temporary_session"`,
    // );
    // await queryRunner.query(
    //   `CREATE TABLE "session" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" datetime NOT NULL DEFAULT (datetime('now')), "minutes" integer NOT NULL, "completed" boolean NOT NULL DEFAULT (1), "legacy" boolean NOT NULL DEFAULT (1), "every" integer NOT NULL DEFAULT (1), "ends" datetime DEFAULT (NULL))`,
    // );
    // await queryRunner.query(
    //   `INSERT INTO "session"("id", "date", "minutes", "completed", "legacy", "every", "ends") SELECT "id", "date", "minutes", "completed", "legacy", "every", "ends" FROM "temporary_session"`,
    // );
    // await queryRunner.query(`DROP TABLE "temporary_session"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
