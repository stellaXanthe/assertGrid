import type { Page } from "playwright-core";

export async function runActionStep(page: Page, step: any) {
  const selector = step.selector;
  if (selector && step.action !== "goto") {
    await page.waitForSelector(selector, { timeout: 8000, state: "attached" });
  }

  switch (step.action) {
    case "goto":
      await page.goto(step.url || step.targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      break;
    case "click":
      await page.click(selector, { timeout: 8000 });
      break;
    case "dblclick":
      await page.dblclick(selector, { timeout: 8000 });
      break;
    case "fill":
      await page.fill(selector, step.value || "", { timeout: 8000 });
      break;
    case "clear":
      await page.fill(selector, "", { timeout: 8000 });
      break;
    case "press":
      await page.press(selector, step.value || "Enter", { timeout: 8000 });
      break;
    case "check":
      await page.check(selector, { timeout: 8000 });
      break;
    case "uncheck":
      await page.uncheck(selector, { timeout: 8000 });
      break;
    case "selectOption":
      await page.selectOption(selector, step.value || "", { timeout: 8000 });
      break;
    case "hover":
      await page.hover(selector, { timeout: 8000 });
      break;
    case "dragTo":
      await page.dragAndDrop(selector, step.value || "", { timeout: 8000 });
      break;
    case "setInputFiles":
      await page.setInputFiles(selector, step.value || "");
      break;
    default:
      throw new Error(`Unsupported action: ${step.action}`);
  }
}

export async function runAssertionStep(page: Page, step: any) {
  const selector = step.selector;
  const locator = selector ? page.locator(selector).first() : null;

  switch (step.assertionType) {
    case "toBeVisible": {
      if (!locator) throw new Error("Selector is required for toBeVisible");
      await locator.waitFor({ state: "visible", timeout: 8000 });
      break;
    }
    case "toBeHidden": {
      if (!locator) throw new Error("Selector is required for toBeHidden");
      const visible = await locator.isVisible().catch(() => false);
      if (visible) throw new Error(`Element "${selector}" is visible, expected hidden`);
      break;
    }
    case "toHaveText": {
      if (!locator) throw new Error("Selector is required for toHaveText");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const text = ((await locator.textContent()) || "").trim();
      if (text !== (step.value || "").trim()) {
        throw new Error(`Expected text "${step.value}" but got "${text}"`);
      }
      break;
    }
    case "toContainText": {
      if (!locator) throw new Error("Selector is required for toContainText");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const text = (await locator.textContent()) || "";
      if (!text.includes(step.value || "")) {
        throw new Error(`Expected text to contain "${step.value}" but got "${text}"`);
      }
      break;
    }
    case "toHaveValue": {
      if (!locator) throw new Error("Selector is required for toHaveValue");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const value = await locator.inputValue();
      if (value !== (step.value || "")) {
        throw new Error(`Expected value "${step.value}" but got "${value}"`);
      }
      break;
    }
    case "toHaveAttribute": {
      if (!locator) throw new Error("Selector is required for toHaveAttribute");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const attrValue = await locator.getAttribute(step.attributeName || "");
      if (attrValue !== (step.value || "")) {
        throw new Error(
          `Expected attribute "${step.attributeName}" to be "${step.value}" but got "${attrValue}"`
        );
      }
      break;
    }
    case "toBeEnabled": {
      if (!locator) throw new Error("Selector is required for toBeEnabled");
      const enabled = await locator.isEnabled();
      if (!enabled) throw new Error(`Element "${selector}" is disabled, expected enabled`);
      break;
    }
    case "toBeDisabled": {
      if (!locator) throw new Error("Selector is required for toBeDisabled");
      const enabled = await locator.isEnabled();
      if (enabled) throw new Error(`Element "${selector}" is enabled, expected disabled`);
      break;
    }
    case "toHaveURL": {
      const url = page.url();
      if (!url.includes(step.value || "")) {
        throw new Error(`Expected URL to contain "${step.value}" but got "${url}"`);
      }
      break;
    }
    default:
      throw new Error(`Unsupported assertion type: ${step.assertionType}`);
  }
}