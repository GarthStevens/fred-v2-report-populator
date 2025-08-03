const hubspot = require("@hubspot/api-client");
const fs = require("fs");
const dotenv = require("dotenv");
const { parse, formatISO } = require("date-fns");

dotenv.config();

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const hubspotClient = new hubspot.Client({ accessToken: HUBSPOT_TOKEN });

async function searchDeals(dealName) {
  const url = new URL("https://api.hubapi.com/crm/v3/objects/deals/search");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "dealname",
              operator: "CONTAINS_TOKEN",
              value: dealName.trim(),
            },
          ],
        },
      ],
      properties: ["dealname"],
      limit: 10,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to search deals: ${response.status} ${errorBody}`);
  }

  const json = await response.json();

  return json.results.length > 0;
}

function isInvalidDate(dateInput) {
  const date = new Date(dateInput);
  return isNaN(date.getTime()); // true = invalid, false = valid
}

async function run() {
  const reports = JSON.parse(fs.readFileSync("reports.json", "utf8"));

  for (const report of reports) {
    const exists = await searchDeals(report.Reference);

    if (exists) {
      continue;
    }

    createDeal(report);

    return;
  }

  async function createDeal(report) {
    const ccd = parse(report.ConstructionCompletion, "dd/MM/yyyy", new Date());
    const settlement = parse(report.Settlement, "dd/MM/yyyy", new Date());

    const firstUse =
      report.AvailableFirstUseFormula === "settlement"
        ? settlement
        : parse(report.AvailableFirstUseFormula, "dd/MM/yyyy", new Date());

    if (
      isInvalidDate(ccd) ||
      isInvalidDate(settlement) ||
      isInvalidDate(firstUse)
    ) {
      console.log("Skipping", report.Reference);
      return;
    }

    const config = {
      properties: {
        settlement_date: formatISO(settlement, { representation: "date" }),
        ccd: formatISO(ccd, { representation: "date" }),
        first_use_date: formatISO(firstUse, { representation: "date" }),
        dealname: report.Reference,
        purchase_price: report.PurchasePrice,
        property_type: "Unit",
        common_entitlement: report.CommonEntitlementFormula,
        land_value: report.LandValue,
        number_of_levels: report.NumberOfLevels,
        number_of_units: report.NumberOfUnits,
        strata_provider: report.StrataPlanProvider,
        verbal_info: report.VerbalInformationProvidedBy,
        written_info: report.WrittenInformationProvidedBy,
        council: report.CouncilName,
        // is_brand_new:
      },
    };

    try {
      const apiResponse = await hubspotClient.crm.deals.basicApi.create(config);
      console.log(JSON.stringify(apiResponse, null, 2));
    } catch (e) {
      e.message === "HTTP request failed"
        ? console.error(JSON.stringify(e.response, null, 2))
        : console.error(e);
    }
  }
}

run();

/*

  id: z.string(),
  dealname: z.string(),
  council: z.string().nullish(),
  settlement_date: z.coerce.date().nullish(),
  site_inspection_date: z.coerce.date().nullish(),
  purchase_price: z.coerce.number().nullish(),
  property_type: z.string({ description: 'Property Type', message: 'Property type is required.' }).min(1, { message: 'Property type is required' }),
  property_street_address: z.string().nullish(),
  property_suburb: z.string().nullish(),
  property_state: z.string().nullish(),
  property_postcode: z.string().nullish(),
  ccd: z.coerce.date().nullish(),
  common_entitlement: z.coerce.number().nullish(),
  first_use_date: z.coerce.date().nullish(),
  land_value: z.coerce.number().nullish(),
  number_of_levels: z.coerce.number().nullish(),
  number_of_units: z.coerce.number().nullish(),
  property_owner_1_entity: z.string().nullish(),
  property_owner_1_first_name: z.string().nullish(),
  property_owner_1_last_name: z.string().nullish(),
  property_owner_1_ownership: z.coerce.number().nullish(),
  property_owner_2_entity: z.string().nullish(),
  property_owner_2_first_name: z.string().nullish(),
  property_owner_2_last_name: z.string().nullish(),
  property_owner_2_ownership: z.coerce.number().nullish(),
  property_owner_3_entity: z.string().nullish(),
  property_owner_3_first_name: z.string().nullish(),
  property_owner_3_last_name: z.string().nullish(),
  property_owner_3_ownership: z.coerce.number().nullish(),
  property_owner_4_entity: z.string().nullish(),
  property_owner_4_first_name: z.string().nullish(),
  property_owner_4_last_name: z.string().nullish(),
  property_owner_4_ownership: z.coerce.number().nullish(),
  strata_provider: z.string().nullish(),
  verbal_info: z.string().nullish(),
  written_info: z.string().nullish(),
  is_brand_new: z.boolean().nullish(),
 

  if (!HUBSPOT_TOKEN) {
    throw new Error('HubSpot token not set in environment variables');
  }

  const url = new URL(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`);
  url.searchParams.set('properties', propertyNames.join(','));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return notFound()
    }

    const errorBody = await response.text();
    throw new Error(`Failed to fetch deal: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  if (!data || !data.properties) {
    throw new Error('Deal data is missing properties');
  }
*/
