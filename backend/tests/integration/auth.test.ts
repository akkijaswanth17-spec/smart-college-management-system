/**
 * Integration tests against the real Express app + real PostgreSQL database
 * (via DATABASE_URL). Run `npm run prisma:migrate` and `npm run seed` (the
 * admin account these tests log in as comes from the seed script) before
 * running `npm test`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";

const suffix = Date.now();
const studentEmail = `test.student.${suffix}@example.edu`;
const studentId = `TESTSTU${suffix}`;
let departmentId: string;
let adminCookie: string;
const createdUserIds: string[] = [];

beforeAll(async () => {
  const dept = await prisma.department.upsert({
    where: { code: "TEST" },
    update: {},
    create: { name: "Test Department", code: "TEST" },
  });
  departmentId = dept.id;

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@smartcollege.dev", password: "Admin@12345" });
  adminCookie = res.headers["set-cookie"][0];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.department.deleteMany({ where: { code: "TEST" } });
  await prisma.$disconnect();
});

describe("Admin-only student creation (public self-registration is disabled)", () => {
  it("the old public registration endpoint no longer exists", async () => {
    const res = await request(app).post("/api/auth/student/register").send({});
    expect(res.status).toBe(404);
  });

  it("rejects student creation from an unauthenticated caller", async () => {
    const res = await request(app).post("/api/students").send({
      fullName: "Nobody",
      studentId: "SHOULDFAIL",
      email: "nobody@example.edu",
      phone: "9000000000",
      departmentId,
      year: 1,
      section: "A",
    });
    expect(res.status).toBe(401);
  });

  it("an admin creates a student, and the account is always assigned role STUDENT", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Cookie", adminCookie)
      .send({
        fullName: "Test Student",
        studentId,
        email: studentEmail,
        phone: "9000000000",
        departmentId,
        year: 2,
        section: "A",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.student.user.role).toBe("STUDENT");
    expect(res.body.data.student.user.passwordHash).toBeUndefined(); // never returned
    expect(typeof res.body.data.tempPassword).toBe("string");
    createdUserIds.push(res.body.data.student.user.id);
  });

  it("rejects creating a second student with the same email", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Cookie", adminCookie)
      .send({
        fullName: "Duplicate",
        studentId: `${studentId}-DUP`,
        email: studentEmail,
        phone: "9000000000",
        departmentId,
        year: 2,
        section: "A",
      });
    expect(res.status).toBe(409);
  });
});

describe("Admin can delete (deactivate) and reactivate a student account", () => {
  let studentRecordId: string;
  let studentUserId: string;
  const email = `delete.${studentEmail}`;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Cookie", adminCookie)
      .send({
        fullName: "Deletable Student",
        studentId: `${studentId}-DEL`,
        email,
        phone: "9000000000",
        departmentId,
        year: 2,
        section: "A",
      });
    studentRecordId = res.body.data.student.id;
    studentUserId = res.body.data.student.user.id;
    createdUserIds.push(studentUserId);
  });

  it("a non-admin cannot delete a student account", async () => {
    const res = await request(app).delete(`/api/students/${studentRecordId}`);
    expect(res.status).toBe(401);
  });

  it("an admin deletes the account, and the student can no longer log in", async () => {
    const del = await request(app).delete(`/api/students/${studentRecordId}`).set("Cookie", adminCookie);
    expect(del.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: studentUserId } });
    expect(user?.isActive).toBe(false);
  });

  it("an admin can reactivate the account via the status endpoint", async () => {
    const res = await request(app)
      .patch(`/api/students/${studentRecordId}/status`)
      .set("Cookie", adminCookie)
      .send({ isActive: true });
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: studentUserId } });
    expect(user?.isActive).toBe(true);
  });
});

describe("Student login (using the admin-issued temporary password)", () => {
  let tempPassword: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Cookie", adminCookie)
      .send({
        fullName: "Second Test Student",
        studentId: `${studentId}-2`,
        email: `second.${studentEmail}`,
        phone: "9000000000",
        departmentId,
        year: 2,
        section: "A",
      });
    tempPassword = res.body.data.tempPassword;
    createdUserIds.push(res.body.data.student.user.id);
  });

  it("logs the student in with the issued temporary password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `second.${studentEmail}`, password: tempPassword });
    expect(res.status).toBe(200);
    expect(res.body.data.user.mustChangePassword).toBe(true);
  });

  it("also logs the same student in using their Roll Number / Student ID instead of email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `${studentId}-2`, password: tempPassword });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(`second.${studentEmail}`);
  });

  it("rejects login with an incorrect password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `second.${studentEmail}`, password: "WrongPassword" });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated access to /auth/me", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Role-based access control", () => {
  let studentCookie: string;

  beforeAll(async () => {
    const created = await request(app)
      .post("/api/students")
      .set("Cookie", adminCookie)
      .send({
        fullName: "RBAC Test Student",
        studentId: `${studentId}-RBAC`,
        email: `rbac.${studentEmail}`,
        phone: "9000000000",
        departmentId,
        year: 2,
        section: "A",
      });
    createdUserIds.push(created.body.data.student.user.id);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: `rbac.${studentEmail}`, password: created.body.data.tempPassword });
    studentCookie = login.headers["set-cookie"][0];
  });

  it("a student is rejected (403) when calling an admin-only endpoint", async () => {
    const res = await request(app).get("/api/admin/dashboard").set("Cookie", studentCookie);
    expect(res.status).toBe(403);
  });

  it("a student is rejected (403) when calling a faculty/admin student-list endpoint", async () => {
    const res = await request(app).get("/api/students").set("Cookie", studentCookie);
    expect(res.status).toBe(403);
  });

  it("a student CAN access their own notifications", async () => {
    const res = await request(app).get("/api/notifications").set("Cookie", studentCookie);
    expect(res.status).toBe(200);
  });
});
