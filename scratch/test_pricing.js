const mongoose = require("mongoose");
const { applyPricingRules } = require("./src/utils/applyPricingRules");
const connectDB = require("./src/config/db");

async function testPricing() {
  try {
    await connectDB();
    console.log("Connected to DB");

    const params = {
      basePrice: 100,
      companyId: "69a688c2c672c303c672246c", // Example company ID
      category: "passenger",
      cabinId: "697cac64ecbc249e3a769100",
      payloadTypeId: "6996b22f182736130f6ef879",
      originPort: "69a688c2c672c303c672246c",
      destinationPort: "697b0fe902f651bd9b300508",
      partnerId: "69be3ea5d52831d40a503111", // Selling Agent ID
      pricingHierarchy: {
        marineParentId: "69be3ea5d52831d40a503111", // Marine Parent
        commercialParentId: "69be3fa8d52831d40a503164", // Commercial Parent
      }
    };

    console.log("Testing with params:", JSON.stringify(params, null, 2));
    const result = await applyPricingRules(params);
    console.log("Pricing Result:", JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

testPricing();
