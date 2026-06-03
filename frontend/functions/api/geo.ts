const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  NL: "EUR",
  BE: "EUR",
  ES: "EUR",
  IT: "EUR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  MY: "MYR",
  SG: "SGD",
  ZA: "ZAR",
};

export const onRequestGet: PagesFunction = async ({ request }) => {
  const country = request.headers.get("cf-ipcountry") || "IN";
  const currency = COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? "USD";
  return Response.json(
    { country, currency },
    {
      headers: {
        "cache-control": "public, max-age=86400",
      },
    },
  );
};
