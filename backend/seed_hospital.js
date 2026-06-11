const mongoose = require("mongoose");
const Hospital = require("./models/hospital");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/local")
  .then(async () => {
    const hospital = await Hospital.create({
      name: "City General Hospital",
      address: "123 Main Street, Hyderabad, Telangana 500001",
      phone: "+914023456789"
    });

    console.log("Hospital created:", JSON.stringify(hospital, null, 2));
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
