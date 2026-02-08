import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

function loadEnv() {
  const explicitEnvPath = process.env.GUARDIAN_EPUB_ENV;
  if (explicitEnvPath) {
    dotenv.config({ path: explicitEnvPath });
    return;
  }

  const localEnvPath = path.resolve(process.cwd(), ".guardian-epub.env");
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
    return;
  }

  dotenv.config();
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function findLatestEpub(epubDir) {
  const files = fs
    .readdirSync(epubDir)
    .filter(file => file.startsWith("guardian-") && file.endsWith(".epub"))
    .map(file => ({
      name: file,
      mtime: fs.statSync(path.join(epubDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    return null;
  }

  return path.join(epubDir, files[0].name);
}

async function main() {
  loadEnv();

  const gmailUser = getRequiredEnv("GMAIL_USER");
  const gmailAppPassword = getRequiredEnv("GMAIL_APP_PASSWORD");
  const kindleEmail = getRequiredEnv("KINDLE_EMAIL");
  const epubDir = process.env.EPUB_DIR || process.cwd();

  if (!fs.existsSync(epubDir)) {
    throw new Error(`EPUB_DIR does not exist: ${epubDir}`);
  }

  const latestEpub = findLatestEpub(epubDir);
  if (!latestEpub) {
    throw new Error(`No guardian-*.epub files found in ${epubDir}`);
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  await transporter.sendMail({
    from: gmailUser,
    to: kindleEmail,
    subject: "Guardian EPUB",
    text: "Latest Guardian EPUB attached.",
    attachments: [
      {
        filename: path.basename(latestEpub),
        path: latestEpub,
      },
    ],
  });

  console.log(`Sent: ${latestEpub}`);
}

main().catch(error => {
  console.error(error?.message || error);
  process.exit(1);
});
