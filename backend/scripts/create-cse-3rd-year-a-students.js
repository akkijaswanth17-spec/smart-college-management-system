// One-off: create student accounts for CSE III Year Section A, from the
// "III Year CME A MID-I Marks Report" roster (PIN Number column = Student ID).
// Run once against production: node backend/scripts/create-cse-3rd-year-a-students.js
// Reads the real Neon connection string straight from backend/deploy/.env.production.

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
const YEAR = 3;
const SEMESTER = 5;
const SECTION = "A";
const PLACEHOLDER_PHONE = "0000000000";
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

function generateTempPassword() {
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return out;
}

// From the "III Year CME A MID-I Marks Report" — [studentId (PIN Number), fullName].
const STUDENTS = [
  ["23351-CM-101", "Vajragiri Jaswanth Kumar"],
  ["23351-CM-057", "Korampalli Lokcharan"],
  ["24351-CM-001", "Adimulam Varun Sai Teja"],
  ["24351-CM-003", "Akumalla Gaffar"],
  ["24351-CM-005", "Annepaka Akki Jaswanth"],
  ["24351-CM-006", "Anbarason Sai Gopi"],
  ["24351-CM-007", "Angirekula Navya"],
  ["24351-CM-008", "Anneboina Mani Sai"],
  ["24351-CM-009", "Athmakuri Akash"],
  ["24351-CM-010", "Bandla Snehitha"],
  ["24351-CM-011", "Bandlamudi Hemanth Kumar"],
  ["24351-CM-012", "Boddapati Sandeep"],
  ["24351-CM-013", "Boddu Sindhu"],
  ["24351-CM-014", "Bojja Ashok Kumar"],
  ["24351-CM-015", "Bolem Saran Sri Sai"],
  ["24351-CM-016", "Chanamala Tejaswi"],
  ["24351-CM-017", "Chidirala Jaswanth"],
  ["24351-CM-018", "Chinchili Arun Tirumala Kumar"],
  ["24351-CM-019", "Chinni Harshitha"],
  ["24351-CM-020", "Chintakayala Mohith Sai"],
  ["24351-CM-021", "Chintakayala Navaneeth Sai Kumar"],
  ["24351-CM-022", "Chokkara Balaji Venkata Dhanush"],
  ["24351-CM-023", "Dandu Prem Kumar Reddy"],
  ["24351-CM-024", "Darelli Sruthi"],
  ["24351-CM-025", "Darisa Himasri"],
  ["24351-CM-026", "Dasari Shanendra"],
  ["24351-CM-027", "Diddi Navya"],
  ["24351-CM-029", "Gaddala Gowtham"],
  ["24351-CM-031", "Gade Teja Ram"],
  ["24351-CM-032", "Galam Bhuvana Priya"],
  ["24351-CM-033", "Gamini Johnson"],
  ["24351-CM-034", "Gandham Sankeerthana"],
  ["24351-CM-035", "Garike Navyatha"],
  ["24351-CM-036", "Gedala Gangadhar"],
  ["24351-CM-037", "Ginjupalli Mohan Venkata Krishna"],
  ["24351-CM-038", "Gonepalli Charithasri"],
  ["24351-CM-039", "Gundala Uma Venkata Mohan"],
  ["24351-CM-040", "Gundra Repka"],
  ["24351-CM-041", "Jada Kanaka Lingeswara"],
  ["24351-CM-042", "Jalluri Harshith"],
  ["24351-CM-043", "Kadivendi Sanath Naga Aravind Swany"],
  ["24351-CM-044", "Kalidindi Durga Bhavani"],
  ["24351-CM-045", "Kambala Naga Bhargavi Sai"],
  ["24351-CM-046", "Kandula Meghan Ashwanth Kumar"],
  ["24351-CM-047", "Kannekanti Charan Teja"],
  ["24351-CM-048", "Kommisetti Venkata Harika"],
  ["24351-CM-049", "Konkimalla S N V Bhavika Divya Jahnavi"],
  ["24351-CM-050", "Kuncham Ramya Sri"],
  ["24351-CM-051", "Kurakula Venkata Durga Naga Sai"],
  ["24351-CM-052", "Kurilla Kundana Lakshmi"],
  ["24351-CM-053", "Lakkireddy Charan Reddy"],
  ["24351-CM-054", "Maila Naga Kalyan"],
  ["24351-CM-055", "Makke Pavan Kumar"],
  ["24351-CM-056", "Malla Naga Nandan"],
  ["24351-CM-057", "Mannepalli Sai Manikanta"],
  ["24351-CM-058", "Manubolu Venkatesh"],
  ["24351-CM-060", "Masanam Venkata Sri Harsha"],
  ["24351-CM-062", "Meruva Kiran"],
];

async function main() {
  const dept = await prisma.department.findUnique({ where: { code: DEPARTMENT_CODE } });
  if (!dept) throw new Error(`Department ${DEPARTMENT_CODE} not found`);

  console.log(`Creating student accounts under ${dept.name} (${dept.code}), Year ${YEAR} Sem ${SEMESTER} Section ${SECTION}...\n`);

  const results = [];
  let skipped = 0;

  for (const [studentId, fullName] of STUDENTS) {
    const existing = await prisma.student.findUnique({ where: { studentId } });
    if (existing) {
      console.log(`SKIP — ${studentId} (${fullName}) already has an account.`);
      skipped++;
      continue;
    }

    const email = `${studentId.toLowerCase()}@mictech.ac.in`;
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      console.log(`SKIP — ${email} is already registered (unexpected email collision for ${fullName}).`);
      skipped++;
      continue;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "STUDENT",
        mustChangePassword: true,
        student: {
          create: {
            studentId,
            fullName,
            phone: PLACEHOLDER_PHONE,
            departmentId: dept.id,
            year: YEAR,
            semester: SEMESTER,
            section: SECTION,
          },
        },
      },
    });

    results.push({ studentId, fullName, email, password: tempPassword });
  }

  console.log("\n=== Created accounts (save these — passwords are shown only once) ===\n");
  for (const r of results) {
    console.log(`${r.fullName}  (Roll No: ${r.studentId})`);
    console.log(`  Email:    ${r.email}`);
    console.log(`  Password: ${r.password}`);
    console.log("");
  }
  console.log(`Done. ${results.length} account(s) created, ${skipped} skipped.`);
  console.log(`Note: phone is a placeholder (${PLACEHOLDER_PHONE}) — update via Edit Student once you have real numbers.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
