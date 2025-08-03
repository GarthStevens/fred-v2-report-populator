const hubspot = require("@hubspot/api-client");
const fs = require("fs");
const dotenv = require("dotenv");
const { parse, formatISO, set } = require("date-fns");
const { createClient } = require("@supabase/supabase-js");
const { create } = require("domain");

dotenv.config();

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const hubspotClient = new hubspot.Client({ accessToken: HUBSPOT_TOKEN });

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a single supabase client for interacting with your database
const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

function isFloatString(str) {
  return /^-?\d+(\.\d+)?$/.test(str.trim());
}

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

  if (json.results.length === 0) {
    return null;
  }

  return json.results[0].id;
}

function isInvalidDate(dateInput) {
  const date = new Date(dateInput);
  return isNaN(date.getTime()); // true = invalid, false = valid
}

async function deleteDeal(dealId) {
  try {
    const apiResponse = await hubspotClient.crm.deals.basicApi.archive(dealId);
  } catch (e) {
    e.message === "HTTP request failed"
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e);

    throw e;
  }
}

async function buildReport(report) {
  const reportDate = parse(report.ReportDate, "dd/MM/yyyy", new Date());
  if (isInvalidDate(reportDate)) {
    return null;
  }

  const div43File = `output/div-43-${report.ID}.json`;
  const div40File = `output/div-40-${report.ID}.json`;

  const rawDiv43 = fs.existsSync(div43File)
    ? JSON.parse(fs.readFileSync(div43File, "utf8"))
    : [];

  const rawDiv40 = fs.existsSync(div40File)
    ? JSON.parse(fs.readFileSync(div40File, "utf8"))
    : [];

  const division_43 = rawDiv43.map((a) => {
    const installation_date_formula =
      a.InstallationDateFormula === "cc"
        ? `=${a.InstallationDateFormula}`
        : parseAssetDate(a.InstallationDateFormula);

    const rate_formula = !isFloatString(a.RateFormula)
      ? `=${a.RateFormula}`
      : a.RateFormula;

    const quantity_formula = !isFloatString(a.QuantityFormula)
      ? `=${a.QuantityFormula}`
      : a.QuantityFormula;

    return {
      name: a.Name,
      area: a.Area === 0 ? "Unit Specific" : "Common Property",
      installation_date_formula,
      rate_formula,
      quantity_formula,
      scrapped_date: a.ScrappedDateFormula,
      is_given_cost: a.IsGivenCost === "0" ? false : true,
    };
  });

  const division_40 = rawDiv40.map((a) => {
    const installation_date_formula =
      a.InstallationDateFormula === "cc"
        ? `=${a.InstallationDateFormula}`
        : parseAssetDate(a.InstallationDateFormula);

    const rate_formula = !isFloatString(a.RateFormula)
      ? `=${a.RateFormula}`
      : a.RateFormula;

    const quantity_formula = !isFloatString(a.QuantityFormula)
      ? `=${a.QuantityFormula}`
      : a.QuantityFormula;

    return {
      name: a.Name,
      area: a.Area === 0 ? "Unit Specific" : "Common Property",
      installation_date_formula,
      rate_formula,
      quantity_formula,
      scrapped_date: a.ScrappedDateFormula,
      is_given_cost: a.IsGivenCost === "0" ? false : true,
      exclude_from_division_43: a.IsDivision43Deduction === "1" ? false : true,
      hundred_percent_option:
        a.HundredPercentOption === 0
          ? "Yes"
          : a.HundredPercentOption === 1
          ? "No"
          : "Force",
      number_of_items: a.NumberOfItems,
      exclude_fees: a.ExcludeFees === "1" ? true : false,
      exclude_expenditure: a.ExcludeExpenditure === "1" ? true : false,
    };
  });

  const result = {
    report_date: formatISO(reportDate, { representation: "date" }),
    years_in_schedule: report.YearsInSchedule,
    pre_notional_write_down_years: report.PreNotionalWriteDownYears,
    notional_write_down_rate: report.NotionalWriteDownRate,
    notional_write_down_governor: report.NotionalWriteDownGovernor,
    preliminary_fees: report.PreliminaryFees,
    reference: report.Reference,
    expenditure_governor: report.ExpenditureGovernor,
    consultancy_fees: report.ConsultancyFees,
    back_claim_years: report.NumberOfYearsToBackClaim,
    division_43,
    division_40,
  };

  return result;
}

const parseDate = (dateString) => {
  const [day, month, year] = dateString.split("/");

  const actualDay = day.length === 1 ? `0${day}` : day;
  const actualMonth = month.length === 1 ? `0${month}` : month;
  let actualYear = "";

  if (year.length === 4) {
    actualYear = year;
  } else {
    const yearNumber = parseInt(year, 10);
    actualYear = yearNumber < 50 ? `20${year}` : `19${year}`;
  }

  const formattedDateString = `${actualDay}/${actualMonth}/${actualYear}`;

  const date = parse(formattedDateString, "dd/MM/yyyy", new Date());
  return isInvalidDate(date)
    ? null
    : formatISO(date, { representation: "date" });
};

const parseAssetDate = (dateString) => {
  const [day, month, year] = dateString.split("/");

  const actualDay = day.length === 1 ? `0${day}` : day;
  const actualMonth = month.length === 1 ? `0${month}` : month;
  let actualYear = "";

  if (year.length === 4) {
    actualYear = year;
  } else {
    const yearNumber = parseInt(year, 10);
    actualYear = yearNumber < 50 ? `20${year}` : `19${year}`;
  }

  const formattedDateString = `${actualDay}/${actualMonth}/${actualYear}`;
  return formattedDateString;
};

async function buildDeal(report) {
  const ccd = parseDate(report.ConstructionCompletion);
  const settlement_date = parseDate(report.Settlement);
  const common_entitlement = parseFloat(report.CommonEntitlementFormula);

  const first_use_date =
    report.AvailableFirstUseFormula === "settlement"
      ? settlement_date
      : parseDate(report.AvailableFirstUseFormula);

  if (
    !ccd ||
    !settlement_date ||
    !first_use_date ||
    isNaN(common_entitlement)
  ) {
    return null;
  }

  const deal = {
    settlement_date,
    ccd,
    first_use_date,
    dealname: report.Reference,
    purchase_price: report.PurchasePrice,
    property_type: "Unit",
    common_entitlement,
    land_value: report.LandValue,
    number_of_levels: report.NumberOfLevels,
    number_of_units: report.NumberOfUnits,
    strata_provider: report.StrataPlanProvider,
    verbal_info: report.VerbalInformationProvidedBy,
    written_info: report.WrittenInformationProvidedBy,
    council: report.CouncilName,
    // is_brand_new:
  };

  return deal;
}

async function createDeal(deal) {
  const config = {
    properties: deal,
  };

  try {
    const apiResponse = await hubspotClient.crm.deals.basicApi.create(config);

    return apiResponse.id;
  } catch (e) {
    e.message === "HTTP request failed"
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e);

    console.error(deal);
    throw e;

    return null;
  }
}

async function createReport({ division_40, division_43, ...report }) {
  const reportExists = await supabase
    .from("reports")
    .select("id")
    .eq("reference", report.reference)
    .maybeSingle();

  if (reportExists.data) {
    await supabase.from("reports").delete().eq("id", reportExists.data.id);
  }

  const { data, error } = await supabase
    .from("reports")
    .insert(report)
    .select("id")
    .single()
    .throwOnError();

  await supabase
    .from("division_40_assets")
    .insert(
      division_40.map((item) => ({
        ...item,
        report_id: data.id,
      }))
    )
    .throwOnError();

  await supabase
    .from("division_43_assets")
    .insert(
      division_43.map((item) => ({
        ...item,
        report_id: data.id,
      }))
    )
    .throwOnError();
}

async function run() {
  const reports = JSON.parse(fs.readFileSync("reports.json", "utf8"));

  for (let i = 0; i < 20; i++) {
    //   for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    console.log(`Processing report: ${r.Reference}`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const existingId = await searchDeals(r.Reference);

    if (existingId) {
      await deleteDeal(existingId);
    }

    const deal = await buildDeal(r);
    const report = await buildReport(r);

    if (!deal || !report) {
      console.log(
        `Skipping report ${report.Reference} due to invalid dates or missing data`
      );
      continue;
    }

    const dealId = await createDeal(deal);
    await createReport({ ...report, hubspot_deal_id: dealId });

    console.log(`Created deal for report ${r.Reference} with ID ${dealId}`);
  }
}

run();

// console.log(parseFloat('44006.77+4000.62'));

/*

*/
