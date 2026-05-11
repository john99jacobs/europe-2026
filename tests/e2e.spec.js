const { test, expect } = require('@playwright/test');

// All tests use ?date= to override the system date.
// This also validates that the override itself works correctly.

test.describe('Pre-trip: countdown', () => {
  test('shows days-until-departure before May 31', async ({ page }) => {
    await page.goto('/?date=2026-05-10');
    await expect(page.locator('.countdown-number')).toBeVisible();
    await expect(page.locator('.countdown-label')).toContainText('days until departure');
    await expect(page.locator('.countdown-date')).toContainText('May 31');
  });
});

test.describe('During trip: today view', () => {
  test('?date param overrides system date', async ({ page }) => {
    await page.goto('/?date=2026-06-03');
    await expect(page.locator('.day-number')).toContainText('Day 4 of 15');
  });

  test('shows correct day label and city', async ({ page }) => {
    await page.goto('/?date=2026-06-03');
    await expect(page.locator('.day-title')).toContainText('Norway in a Nutshell');
    await expect(page.locator('.day-city')).toContainText('Oslo');
  });

  test('shows today events in chronological order', async ({ page }) => {
    await page.goto('/?date=2026-06-03');
    const times = await page.locator('.event-time').allTextContents();
    const filtered = times.filter(t => t.trim());
    // Verify times are in ascending order
    for (let i = 1; i < filtered.length; i++) {
      expect(filtered[i] >= filtered[i - 1]).toBeTruthy();
    }
  });

  test('shows tomorrow preview when next day exists', async ({ page }) => {
    await page.goto('/?date=2026-06-03');
    await expect(page.locator('.section-label').filter({ hasText: 'Tomorrow' })).toBeVisible();
  });

  test('shows lodging section', async ({ page }) => {
    await page.goto('/?date=2026-06-03');
    await expect(page.locator('.section-label').filter({ hasText: "Tonight's Lodging" })).toBeVisible();
    await expect(page.locator('.lodging-name')).toContainText('Flåm Camping');
  });

  test('shows event notes where present', async ({ page }) => {
    await page.goto('/?date=2026-06-07');
    await expect(page.locator('.event-note').first()).toContainText('tickets');
  });

  test('last day has no tomorrow preview', async ({ page }) => {
    await page.goto('/?date=2026-06-14');
    await expect(page.locator('.section-label').filter({ hasText: 'Tomorrow' })).toHaveCount(0);
  });
});

test.describe('Post-trip', () => {
  test('shows trip complete message after June 14', async ({ page }) => {
    await page.goto('/?date=2026-06-15');
    await expect(page.locator('.trip-complete-title')).toContainText('Trip Complete');
  });
});

test.describe('Itinerary view', () => {
  test('shows all 15 days', async ({ page }) => {
    await page.goto('/#itinerary');
    await expect(page.locator('.itinerary-day')).toHaveCount(15);
  });

  test('unbooked events show Not Booked badge', async ({ page }) => {
    await page.goto('/#itinerary');
    await expect(page.locator('.badge--unbooked').first()).toBeVisible();
  });

  test('unbooked events also show their event type badge', async ({ page }) => {
    await page.goto('/#itinerary');
    // Find an unbooked event card and verify it has both badges
    const unbookedEvent = page.locator('.event--unbooked').first();
    await expect(unbookedEvent.locator('.badge--unbooked')).toBeVisible();
    await expect(unbookedEvent.locator('.badge--activity')).toBeVisible();
  });

  test('highlights current day during trip', async ({ page }) => {
    await page.goto('/?date=2026-06-07#itinerary');
    await expect(page.locator('.itinerary-day--today')).toHaveCount(1);
    await expect(page.locator('.itinerary-today-chip')).toContainText('Today');
  });

  test('no today highlight before trip starts', async ({ page }) => {
    await page.goto('/?date=2026-05-10#itinerary');
    await expect(page.locator('.itinerary-day--today')).toHaveCount(0);
  });
});

test.describe('Navigation', () => {
  test('default landing is today view', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#view-today')).toBeVisible();
    await expect(page.locator('#view-itinerary')).toBeHidden();
  });

  test('tab switches between views', async ({ page }) => {
    await page.goto('/');
    await page.click('#tab-itinerary');
    await expect(page.locator('#view-itinerary')).toBeVisible();
    await expect(page.locator('#view-today')).toBeHidden();
    await page.click('#tab-today');
    await expect(page.locator('#view-today')).toBeVisible();
  });

  test('itinerary scroll position preserved on tab switch', async ({ page }) => {
    await page.goto('/#itinerary');
    await page.locator('.itinerary-day').last().scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.click('#tab-today');
    await page.click('#tab-itinerary');
    // Wait for requestAnimationFrame scroll restoration to settle
    await page.waitForFunction(
      (expected) => window.scrollY === expected,
      scrollBefore,
      { timeout: 1000 }
    );
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(scrollBefore);
  });
});
