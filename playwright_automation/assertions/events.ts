import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type DomEventName = string;

type EventHost =
  | { selector: string }
  | { shadowHost: string; innerSelector: string };

function hostLabel(host: EventHost): string {
  return 'selector' in host
    ? host.selector
    : `${host.shadowHost} >> ${host.innerSelector}`;
}

/**
 * Attach the listener before the action. Starting both together drops the
 * event when the click or key lands before evaluate() registers the listener,
 * and the pending evaluate then runs until the test timeout.
 */
async function armHostEvent(
  page: Page,
  host: EventHost,
  eventName: DomEventName
): Promise<void> {
  await page.evaluate(
    ({ host, name }) => {
      const target =
        'selector' in host
          ? document.querySelector(host.selector)
          : (document
              .querySelector(host.shadowHost)
              ?.shadowRoot?.querySelector(host.innerSelector) ?? null);
      if (!target) {
        throw new Error('Event host not found');
      }
      const record = window as Window & { __modusEventHits?: string[] };
      record.__modusEventHits = [];
      target.addEventListener(name, () => {
        record.__modusEventHits?.push(name);
      });
    },
    { host, name: eventName }
  );
}

async function expectEventOnAction(
  page: Page,
  host: EventHost,
  eventName: DomEventName,
  action: () => Promise<void>
): Promise<void> {
  await armHostEvent(page, host, eventName);
  await action();
  await expect
    .poll(
      () =>
        page.evaluate(
          (name) =>
            (
              (window as Window & { __modusEventHits?: string[] })
                .__modusEventHits ?? []
            ).includes(name),
          eventName
        ),
      {
        timeout: 5_000,
        message: `Expected ${eventName} on ${hostLabel(host)}`,
      }
    )
    .toBe(true);
}

export async function expectHostEventOnAction(
  page: Page,
  hostSelector: string,
  eventName: DomEventName,
  action: () => Promise<void>
): Promise<void> {
  await expectEventOnAction(
    page,
    { selector: hostSelector },
    eventName,
    action
  );
}

export async function expectShadowHostEventOnAction(
  page: Page,
  shadowHost: string,
  innerSelector: string,
  eventName: DomEventName,
  action: () => Promise<void>
): Promise<void> {
  await expectEventOnAction(
    page,
    { shadowHost, innerSelector },
    eventName,
    action
  );
}
