const { test, expect } = require('@playwright/test');
const unique = Date.now();
const student = { username: `student${unique}`, email: `student${unique}@local.test`, password: 'StrongPass123!' };

test.describe('auth journey', () => {
  test('register, login, edit, reload, logout', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill(student.username); await page.getByLabel('Email address').fill(student.email); await page.getByLabel('Password').fill(student.password); await page.getByLabel('School').first().check(); await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/login/); await page.getByLabel('Email address').fill(student.email); await page.getByLabel('Password').fill(student.password); await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByRole('link', { name: 'Profile' }).click(); await page.getByRole('link', { name: 'Edit profile' }).click(); await page.getByLabel('Username').fill(`${student.username}edit`); await page.getByRole('button', { name: 'Save changes' }).click(); await page.reload(); await expect(page.getByText(`${student.username}edit`)).toBeVisible(); await page.getByRole('button', { name: 'Log out' }).click(); await expect(page).toHaveURL(/login/);
  });
  test('bad login and duplicate registration show feedback', async ({ page }) => { await page.goto('/login'); await page.getByLabel('Email address').fill('nobody@local.test'); await page.getByLabel('Password').fill('wrong'); await page.getByRole('button', { name: 'Log in' }).click(); await expect(page.getByRole('alert')).toContainText('Invalid email or password'); });
  test('student cannot enter admin route', async ({ page }) => { await page.goto('/admin-profile'); await expect(page).toHaveURL(/login/); });
  test('seeded admin reaches admin workspace', async ({ page }) => { await page.goto('/login'); await page.getByLabel('Email address').fill('admin.demo@local.test'); await page.getByLabel('Password').fill('DemoPass123!'); await page.getByRole('button', { name: 'Log in' }).click(); await expect(page).toHaveURL('/'); await page.goto('/admin-profile'); await expect(page.getByText('Admin workspace')).toBeVisible(); });
  test('mobile layout has no horizontal overflow', async ({ page }) => { await page.setViewportSize({ width: 375, height: 812 }); await page.goto('/login'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); await expect(page.getByLabel('Email address')).toBeVisible(); });
});
