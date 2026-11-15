/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture `use` parameter, not React hook */
import { test as base, Page, APIRequestContext } from '@playwright/test';
import path from 'path';

interface TestFixtures {
  studentPage: Page;
  teacherPage: Page;
  adminPage: Page;
  adminApi: APIRequestContext;
  studentApi: APIRequestContext;
  anonymousApi: APIRequestContext;
}

function getBaseURL(): string {
  return process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
}

export const test = base.extend<TestFixtures>({
  studentPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '.auth', 'student.json');
    const context = await browser.newContext({
      storageState: authFile,
    });
    const studentPage = await context.newPage();
    await use(studentPage);
    await context.close();
  },
  
  teacherPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '.auth', 'teacher.json');
    const context = await browser.newContext({
      storageState: authFile,
    });
    const teacherPage = await context.newPage();
    await use(teacherPage);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '.auth', 'admin.json');
    const context = await browser.newContext({
      storageState: authFile,
    });
    const adminPage = await context.newPage();
    await use(adminPage);
    await context.close();
  },

  adminApi: async ({}, use) => {
    const baseURL = getBaseURL();
    const authFile = path.join(__dirname, '.auth', 'admin.json');
    const apiContext = await import('@playwright/test').then(m => m.request.newContext({
      baseURL,
      storageState: authFile,
    }));
    await use(apiContext);
    await apiContext.dispose();
  },

  studentApi: async ({}, use) => {
    const baseURL = getBaseURL();
    const authFile = path.join(__dirname, '.auth', 'student.json');
    const apiContext = await import('@playwright/test').then(m => m.request.newContext({
      baseURL,
      storageState: authFile,
    }));
    await use(apiContext);
    await apiContext.dispose();
  },

  anonymousApi: async ({}, use) => {
    const baseURL = getBaseURL();
    const apiContext = await import('@playwright/test').then(m => m.request.newContext({
      baseURL,
    }));
    await use(apiContext);
    await apiContext.dispose();
  },
});

export { expect } from '@playwright/test';