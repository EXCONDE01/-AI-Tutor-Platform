import { test, expect } from './fixtures';

test.describe('Student Sessions', () => {
  test('Student can see 9 sessions listed', async ({ studentPage }) => {
    await studentPage.goto('/student/sessions');
    
    // Wait for sessions to load
    await studentPage.waitForLoadState('networkidle');
    
    // Verify we're on the student sessions page
    await expect(studentPage).toHaveURL(/\/student\/sessions/);
    
    // Find session cards - SessionCard component renders as Card elements in a grid
    const sessionCards = studentPage.locator('.card-elevated.card-hover').first();
    await expect(sessionCards).toBeVisible({ timeout: 15000 });
    
    // Count sessions - expecting 9
    const sessions = studentPage.locator('.card-elevated.card-hover');
    await expect(sessions).toHaveCount(9);
  });
});