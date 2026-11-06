import { MigrationInterface, QueryRunner } from "typeorm";

export class SessionV6_1789757458000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_session" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "date" datetime NOT NULL DEFAULT (datetime('now')),
        "minutes" integer NOT NULL,
        "completed" text CHECK( "completed" IN ('none','completed','noshow','latecancel') ) NOT NULL DEFAULT ('none'),
        "legacy" boolean NOT NULL,
        "every" integer NOT NULL,
        "ends" datetime
      )`,
    );

    await queryRunner.query(
      `INSERT INTO "temporary_session"
        ("id", "date", "minutes", "legacy", "every", "ends", "completed")
        SELECT "id", "date", "minutes", "legacy", "every", "ends",
          CASE
            WHEN "completed" = TRUE THEN 'completed'
            ELSE 'none'
          END
        FROM "session"
      `,
    );

    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_session" RENAME TO "session"`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
