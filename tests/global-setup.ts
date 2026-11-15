import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authDir = path.join(__dirname, '.auth');
const studentAuthFile = path.join(authDir, 'student.json');
const teacherAuthFile = path.join(authDir, 'teacher.json');
const adminAuthFile = path.join(authDir, 'admin.json');

async function saveAuthState(
  baseURL: string,
  email: string,
  password: string,
  expectedPath: string,
  file: string,
  roleName: string
) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/sign-in`);
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**${expectedPath}**`, { timeout: 30000 });
    await context.storageState({ path: file });
    console.log(`${roleName} auth state saved to ${file}`);
  } catch (error) {
    console.error(`Failed to save ${roleName} auth state:`, error);
    throw new Error(`${roleName} login failed: ${error}`);
  } finally {
    await browser.close();
  }
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000';
  
  // Create auth directory if it doesn't exist
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Login as student and save storage state
  await saveAuthState(
    baseURL,
    'pupil.one@example.com',
    'PupilPassw0rd!23',
    '/student/',
    studentAuthFile,
    'student'
  );

  // Login as teacher and save storage state
  await saveAuthState(
    baseURL,
    'teacher2@demo.local',
    'TeacherPassw0rd!23',
    '/teacher/',
    teacherAuthFile,
    'teacher'
  );

  // Login as admin and save storage state
  await saveAuthState(
    baseURL,
    'christianexconde01@gmail.com',
    'JeloyskiAdmin01',
    '/admin/lti/platforms',
    adminAuthFile,
    'admin'
  );
}

export default globalSetup;