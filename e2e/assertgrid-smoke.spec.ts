import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('AssertGrid Platform Smoke Tests', () => {
  test('should load dashboard successfully', async ({ page }) => {
    await allure.epic('Dashboard Module');
    await allure.feature('Navigation & Branding');
    await allure.severity('critical');

    await allure.step('Navigate to Dashboard Page', async () => {
      await page.goto('/dashboard');
    });

    await allure.step('Verify Dashboard Heading & Navigation Brand', async () => {
      const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
      await expect(dashboardHeading).toBeVisible();

      const brandLink = page.getByRole('link', { name: /AssertGrid/i });
      await expect(brandLink).toBeVisible();
    });
  });

  test('should present create project options', async ({ page }) => {
    await allure.epic('Dashboard Module');
    await allure.feature('Project Creation');
    await allure.severity('normal');

    await allure.step('Navigate to Dashboard', async () => {
      await page.goto('/dashboard');
    });

    await allure.step('Check for New Project Button', async () => {
      const newProjectBtn = page.getByRole('button', { name: /\+ New Project/i });
      await expect(newProjectBtn).toBeVisible();
    });
  });
});