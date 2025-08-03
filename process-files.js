const fs = require("fs");
const path = require("path");

// Load reports fully (small enough)
const reports = JSON.parse(fs.readFileSync("reports.json", "utf8"));

// Create a map of report IDs for fast lookup
const reportIds = new Set(reports.map((r) => r.ID));

function processDiv43() {
  // Load the full asset list (this assumes your machine can handle loading it in memory)
  const allAssets = JSON.parse(fs.readFileSync("div-43-all.json", "utf8"));

  // Organise assets by report ID
  const assetsByReport = {};

  for (const asset of allAssets) {
    const reportId = asset.ReportID;
    if (!reportIds.has(reportId)) continue;

    if (!assetsByReport[reportId]) {
      assetsByReport[reportId] = [];
    }

    assetsByReport[reportId].push(asset);
  }

  // Ensure output directory exists
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Write assets to individual files
  for (const [reportId, assets] of Object.entries(assetsByReport)) {
    const filename = `div-43-${reportId}.json`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(assets, null, 2));
    console.log(`Wrote ${assets.length} assets to ${filename}`);
  }
}


function processDiv40() {
  // Load the full asset list (this assumes your machine can handle loading it in memory)
  const allAssets = JSON.parse(fs.readFileSync("div-40-all.json", "utf8"));

  // Organise assets by report ID
  const assetsByReport = {};

  for (const asset of allAssets) {
    const reportId = asset.ReportID;
    if (!reportIds.has(reportId)) continue;

    if (!assetsByReport[reportId]) {
      assetsByReport[reportId] = [];
    }

    assetsByReport[reportId].push(asset);
  }

  // Ensure output directory exists
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Write assets to individual files
  for (const [reportId, assets] of Object.entries(assetsByReport)) {
    const filename = `div-40-${reportId}.json`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(assets, null, 2));
    console.log(`Wrote ${assets.length} assets to ${filename}`);
  }
}


processDiv40()
processDiv43();