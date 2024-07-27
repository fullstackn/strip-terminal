import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { AppManifest } from "@saleor/app-sdk/types";

import packageJson from "../../../package.json";
import { orderCreatedWebhook } from "./webhooks/order-created";

/**
 * App SDK helps with the valid Saleor App Manifest creation. Read more:
 * https://github.com/saleor/saleor-app-sdk/blob/main/docs/api-handlers.md#manifest-handler-factory
 */
export default createManifestHandler({
  async manifestFactory({ appBaseUrl, request }) {
    /**
     * Allow to overwrite default app base url, to enable Docker support.
     *
     * See docs: https://docs.saleor.io/docs/3.x/developer/extending/apps/local-app-development
     */
    const iframeBaseUrl = process.env.APP_IFRAME_BASE_URL ?? appBaseUrl;
    const apiBaseURL = process.env.APP_API_BASE_URL ?? appBaseUrl;

    const manifest: AppManifest = {
      name: 'Stripe Terminal Payments',
      tokenTargetUrl: `${apiBaseURL}/api/register`,
      appUrl: iframeBaseUrl,
      permissions: [
        "MANAGE_ORDERS", "HANDLE_PAYMENTS"
      ],
      id: "stripe.terminal.saleor.app",
      version: packageJson.version,
      webhooks: [orderCreatedWebhook.getWebhookManifest(apiBaseURL)],
      extensions: [
          {
        "label": "STRIPE N",
        "mount": "ORDER_DETAILS_MORE_ACTIONS",
        "target": "APP_PAGE",
        "permissions": [
            "MANAGE_ORDERS", "HANDLE_PAYMENTS"
        ],
        "url": "/actions"
      },

      ],
      author: "FullStack Natan",
      brand: {
        logo: {
          default: `${apiBaseURL}/logo.png`,
        },
      },
    };

    return manifest;
  },
});
