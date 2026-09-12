import { describe, it, expect } from "vitest";
import { loginSchema } from "../../src/validators/auth.validators";
import { createStudentSchema } from "../../src/validators/student.validators";

describe("createStudentSchema (admin-only student creation)", () => {
  const validBody = {
    fullName: "Aarav Mehta",
    studentId: "STU001",
    email: "aarav@example.edu",
    phone: "9000000000",
    departmentId: "dept_1",
    year: 2,
    section: "A",
  };

  it("accepts a well-formed creation payload", () => {
    const result = createStudentSchema.parse({ body: validBody, query: {}, params: {} });
    expect(result.body.fullName).toBe("Aarav Mehta");
  });

  it("strips any client-supplied 'role' or 'password' field — the server always assigns STUDENT and generates the password", () => {
    const result = createStudentSchema.parse({
      body: { ...validBody, role: "ADMIN", password: "whatever" },
      query: {},
      params: {},
    });
    const body = result.body as Record<string, unknown>;
    expect(body.role).toBeUndefined();
    expect(body.password).toBeUndefined();
  });

  it("rejects a missing required field", () => {
    const { studentId, ...incomplete } = validBody;
    expect(() => createStudentSchema.parse({ body: incomplete, query: {}, params: {} })).toThrow();
  });
});

describe("loginSchema", () => {
  it("accepts a valid email as the identifier", () => {
    const result = loginSchema.parse({ body: { email: "a@b.com", password: "x" }, query: {}, params: {} });
    expect(result.body.email).toBe("a@b.com");
  });

  it("also accepts a plain Roll Number / Student ID as the identifier — students may log in with either", () => {
    const result = loginSchema.parse({ body: { email: "STU001", password: "x" }, query: {}, params: {} });
    expect(result.body.email).toBe("STU001");
  });

  it("rejects an empty identifier", () => {
    expect(() => loginSchema.parse({ body: { email: "", password: "x" }, query: {}, params: {} })).toThrow();
  });
});
