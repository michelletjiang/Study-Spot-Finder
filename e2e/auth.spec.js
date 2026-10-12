const { test, expect } = require('@playwright/test');

const unique = Date.now();
const student = { username: `student${unique}`, email: `student${unique}@local.test`, password: 'StrongPass123!' };

async function register(page, account = student, extra = {}) {
  await page.goto('/register');
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Email address').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByLabel('School').first().check();
  await page.locator('form').evaluate((form, role) => {
    if (role) { const input = document.createElement('input'); input.name = 'role'; input.value = role; form.append(input); }
  }, extra.role);
  await page.getByRole('button', { name: 'Create account' }).click();
}

test.describe('real MongoDB auth journey', () => {
  test('register, login, edit, reload and logout', async ({ page }) => {
    await register(page);
    await expect(page).toHaveURL(/login/);
    await page.getByLabel('Email address').fill(student.email);
    await page.getByLabel('Password').fill(student.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.getByRole('link', { name: 'Edit profile' }).click();
    await page.getByLabel('Username').fill(`${student.username}edit`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.reload();
    await expect(page.getByText(`${student.username}edit`)).toBeVisible();
    await page.screenshot({ path: 'test-results/student-profile-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/login/);
  });

  test('bad login and duplicate registration show feedback', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('nobody@local.test');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid email or password');
    await register(page, { username: 'studentdemo', email: 'student.demo@local.test', password: 'AnotherPass123!' });
    await expect(page.getByRole('alert')).toContainText('Email already registered');
  });

  test('registration ignores role tampering', async ({ page }) => {
    const account = { username: `tampered${unique}`, email: `tampered${unique}@local.test`, password: 'StrongPass123!' };
    await register(page, account, { role: 'Admin' });
    await page.getByLabel('Email address').fill(account.email);
    await page.getByLabel('Password').fill(account.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
    await expect(page).toHaveURL('/');
  });

  test('authenticated Student is denied from admin route', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('student.demo@local.test');
    await page.getByLabel('Password').fill('DemoPass123!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.goto('/admin-profile');
    await expect(page).toHaveURL(/profile/);
    await expect(page.getByText('Admin workspace')).toHaveCount(0);
  });

  test('unauthenticated protected navigation redirects to login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/login/);
  });

  test('seeded Admin reaches admin workspace', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('admin.demo@local.test');
    await page.getByLabel('Password').fill('DemoPass123!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.goto('/admin-profile');
    await expect(page.getByText('Admin workspace')).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-workspace-desktop.png', fullPage: true });
  });

  test('mobile auth layout has focus and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await page.getByLabel('Email address').focus();
    await expect(page.getByLabel('Email address')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
  });
});
