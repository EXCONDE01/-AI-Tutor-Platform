import { test, expect } from './fixtures';

test.describe('Student Chat Interventions', () => {
  const demoSessionId = '8ffee8d2-f7d0-49c9-b1e8-e4b598e738f1';
  
  test('Student can see teacher interventions as amber bubbles', async ({ studentPage }) => {
    await studentPage.goto(`/student/chat/${demoSessionId}`);
    
    // Wait for chat to load
    await studentPage.waitForLoadState('networkidle');
    
    // Verify we're on the chat page
    await expect(studentPage).toHaveURL(new RegExp(`/student/chat/${demoSessionId}`));
    
    // Wait for messages to load - chat uses flex gap-3 for message bubbles
    await studentPage.waitForSelector('.flex.gap-3', { timeout: 15000 });
    
    // Find teacher intervention messages (amber bubbles) - they have bg-amber-50 / dark:bg-amber-900/20 styling
    // System messages with isIntervention=true have amber styling
    const interventions = studentPage.locator('div[class*="amber-50"], div[class*="amber-900"], div:has-text("Teacher Intervention")');
    
    // At least one intervention should be visible
    await expect(interventions.first()).toBeVisible({ timeout: 15000 });
    
    // Verify intervention content is present
    const interventionCount = await interventions.count();
    expect(interventionCount).toBeGreaterThan(0);
    
    console.log(`Found ${interventionCount} teacher intervention(s)`);
  });
});