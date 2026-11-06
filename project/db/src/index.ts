import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Student } from "./entity/Student";
import { Deposit } from "./entity/Deposit";
import { Session } from "./entity/Session";
import { readFile } from "fs/promises";

const current = process.cwd();

async function load_deposits() {
  const contents = await readFile(`${current}/data/deposits.txt`).then((f) =>
    f.toString("utf-8"),
  );

  const lines = contents
    .split("\n")
    .slice(1)
    .filter((v) => !!v)
    .map((v) => v.replaceAll('"', "").split(","));

  return lines;
}

async function load_students() {
  const contents = await readFile(`${current}/data/students.txt`).then((f) =>
    f.toString("utf-8"),
  );

  const lines = contents
    .split("\n")
    .slice(1)
    .filter((v) => !!v)
    .map((v) => v.replaceAll('"', "").split(","));

  return lines;
}

async function load_sessions() {
  const contents = await readFile(`${current}/data/withdrawals.txt`).then((f) =>
    f.toString("utf-8"),
  );

  const lines = contents
    .split("\n")
    .slice(1)
    .filter((v) => !!v)
    .map((v) => v.replaceAll('"', "").split(","));

  return lines;
}

AppDataSource.initialize()
  .then(async () => {
    // console.log("Inserting a new user into the database...");

    // Add a student
    // Add students
    // const students = await load_students();
    // const students_map = {};
    // for (let student of students) {
    //   const student_v = new Student();
    //   student_v.name = student[0];
    //   student_v.active = student[1] == "1";
    //   const out = await AppDataSource.manager.save(student_v);
    //   students_map[student_v.name] = student_v;
    // }

    // // Add deposits
    // const deposits = await load_deposits();
    // for (let deposit of deposits) {
    //   const deposit_v = new Deposit();
    //   deposit_v.student = students_map[deposit[0]];
    //   if (!deposit_v.student) {
    //     throw new Error("THERE'S A PrOBLELM DEPOSIT " + deposit[0]);
    //   }
    //   deposit_v.date = new Date(deposit[1]);
    //   deposit_v.cents = +deposit[2] * 100;
    //   const out = await AppDataSource.manager.save(deposit_v);
    // }

    // // Add sessions
    // const sessions = await load_sessions();
    // for (let session of sessions) {
    //   const session_v = new Session();
    //   session_v.student = students_map[session[0]];
    //   if (!session_v.student) {
    //     throw new Error("THERE'S A PrOBLELM SESSION " + session[0]);
    //   }
    //   session_v.date = new Date(session[1]);
    //   session_v.minutes = +session[2] * 60;
    //   const out = await AppDataSource.manager.save(session_v);
    // }

    console.log(
      "Here you can setup and run express / fastify / any other framework.",
    );
  })
  .catch((error) => console.log(error));
