import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    // Get the entire context of a story, including parameters, args, argTypes, etc.
    const storyContext = await getStoryContext(page, context);

    // Check for accessibility violations
    if (storyContext.parameters?.a11y?.disable) {
      return;
    }

    // Run accessibility tests
    await page.evaluate(() => {
      // You can add custom accessibility checks here
    });
  },
};

export default config;
