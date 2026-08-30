const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PAYPAL_NOT_CONFIGURED");
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PAYPAL_AUTH_FAILED: ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function createPayPalOrder(amountUsdCents: number, customId: string) {
  const token = await getPayPalAccessToken();
  const amountFormatted = (amountUsdCents / 100).toFixed(2);

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: customId,
          description: "Valax Scrub Non-Financial Utility Credits",
          amount: {
            currency_code: "USD",
            value: amountFormatted,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`PAYPAL_CREATE_ORDER_FAILED: ${errorData}`);
  }

  return await res.json();
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`PAYPAL_CAPTURE_FAILED: ${errorData}`);
  }

  return await res.json();
}