import fs from "fs";
import csv from "csvtojson";

async function convertCsvToJson(csvFilePath, jsonFilePath) {
  const jsonArray = await csv().fromFile(csvFilePath);
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonArray, null, 2));
  console.log("CSV converted to JSON ✅");
}

convertCsvToJson("asia.csv", "stores.json");
