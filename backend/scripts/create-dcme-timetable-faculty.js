// One-off: create faculty accounts for the real DCME III/V Sem A timetable
// (DCME-F014). Run once against production: node backend/scripts/create-dcme-timetable-faculty.js
// Reads the real Neon connection string straight from backend/deploy/.env.production
// so nothing needs to be typed/pasted by hand.

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const envProdPath = path.join(__dirname, "../deploy/.env.production");
const envProd = fs.readFileSync(envProdPath, "utf8");
const match = envProd.match(/^DATABASE_URL="(.*)"$/m);
if (!match) throw new Error("Could not find DATABASE_URL in backend/deploy/.env.production");
const DATABASE_URL = match[1];

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

const DEPARTMENT_CODE = "CSE";
const PLACEHOLDER_PHONE = "0000000000";
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

function generateTempPassword() {
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return out;
}

// From DCME-F014 (III DCME / V SEM A) timetable — the DCME class maps to the
// existing CSE department in this system. Real names, titles, and IDs as printed on the sheet.
const FACULTY = [
  { facultyId: "2095", title: "Mr.", fullName: "Emmanuel" },
  { facultyId: "1660", title: "Mr.", fullName: "S. Ravikanth" },
  { facultyId: "2202", title: "Ms.", fullName: "Chandra Bhanu" },
  { facultyId: "1614", title: "Mr.", fullName: "Venu Babu" },
  { facultyId: "2194", title: "Mr.", fullName: "SK. John Basha" },
  { facultyId: "2201", title: "Mr.", fullName: "J. Venkateswara Rao" },
  { facultyId: "2130", title: "Mr.", fullName: "K.N.V.B.G. Pavan Kumar" },
];

async function main() {
  const dept = await prisma.department.findUnique({ where: { code: DEPARTMENT_CODE } });
  if (!dept) throw new Error(`Department ${DEPARTMENT_CODE} not found`);

  console.log(`Creating faculty accounts under ${dept.name} (${dept.code})...\n`);

  const results = [];

  for (const f of FACULTY) {
    const existing = await prisma.faculty.findUnique({ where: { facultyId: f.facultyId } });
    if (existing) {
      console.log(`SKIP — Faculty ID ${f.facultyId} (${f.fullName}) already has an account.`);
      continue;
    }

    const email = `${f.facultyId}@mictech.ac.in`;
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      console.log(`SKIP — ${email} is already registered (unexpected email collision for ${f.fullName}).`);
      continue;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "FACULTY",
        mustChangePassword: true,
        faculty: {
          create: {
            facultyId: f.facultyId,
            title: f.title,
            fullName: f.fullName,
            phone: PLACEHOLDER_PHONE,
            departmentId: dept.id,
            designation: "Faculty",
          },
        },
      },
    });

    results.push({ name: `${f.title} ${f.fullName}`, facultyId: f.facultyId, email, password: tempPassword });
  }

  console.log("\n=== Created accounts (save these — passwords are shown only once) ===\n");
  for (const r of results) {
    console.log(`${r.name}  (Faculty ID: ${r.facultyId})`);
    console.log(`  Email:    ${r.email}`);
    console.log(`  Password: ${r.password}`);
    console.log("");
  }
  console.log(`Done. ${results.length} account(s) created, ${FACULTY.length - results.length} skipped.`);
  console.log(`Note: phone is a placeholder (${PLACEHOLDER_PHONE}) — update via Edit Faculty once you have real numbers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
