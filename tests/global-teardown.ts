import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  // Clean up auth files if needed (optional - keeping for debugging)
  const authDir = path.join(__dirname, '.auth');
  const studentAuthFile = path.join(authDir, 'student.json');
  const teacherAuthFile = path.join(authDir, 'teacher.json');
  const adminAuthFile = path.join(authDir, 'admin.json');
  
  // Uncomment to clean up auth files after test run
  // if (fs.existsSync(studentAuthFile)) fs.unlinkSync(studentAuthFile);
  // if (fs.existsSync(teacherAuthFile)) fs.unlinkSync(teacherAuthFile);
  // if (fs.existsSync(adminAuthFile)) fs.unlinkSync(adminAuthFile);
  // if (fs.existsSync(authDir)) fs.rmdirSync(authDir);
  
  console.log('Global teardown complete');
}

export default globalTeardown;