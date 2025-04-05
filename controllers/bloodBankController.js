const BloodBank = require("../models/BloodBank");

// Register Blood Donation
const registerBlood = async (req, res) => {
  const { donorName, bloodGroup, age, phone, gender, quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "Quantity must be greater than 0" });
  }

  const bloodEntry = await BloodBank.create({ donorName, bloodGroup, age, phone, gender, quantity });
  res.status(201).json(bloodEntry);
};

// Get Blood Stock
const getBloodStock = async (req, res) => {
  const bloodStock = await BloodBank.find({});
  res.json(bloodStock);
};
const checkBloodAvailability = async (req, res) => {
  try {
      let { bloodGroup } = req.params;  // ✅ Use req.params instead of req.query
      if (!bloodGroup) {
          return res.status(400).json({ message: "Blood group parameter is required" });
      }

      // Standardize blood group formatting (decode URL and convert to uppercase)
      let trimmedBloodGroup = decodeURIComponent(bloodGroup.trim()).toUpperCase();

      const result = await BloodBank.aggregate([
          { $match: { bloodGroup: trimmedBloodGroup } },  // ✅ Direct match, no regex needed
          { $group: { _id: trimmedBloodGroup, totalQuantity: { $sum: "$quantity" } } }
      ]);

      let totalQuantity = result.length > 0 ? result[0].totalQuantity : 0;
      res.json({ bloodGroup: trimmedBloodGroup, totalQuantity, available: totalQuantity > 0 });
  } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
  }
};


  const getAllBloodAvailability = async (req, res) => {
    try {
      // Ensure only Admin or Reception can access
      if (!req.user || (req.user.role !== "admin" && req.user.role !== "reception")) {
        return res.status(403).json({ message: "Access denied. Only Admin and Reception can access this." });
      }
  
      const bloodStock = await BloodBank.aggregate([
        {
          $group: {
            _id: "$bloodGroup",
            totalQuantity: { $sum: "$quantity" },
            donors: { $push: "$donorName" }
          }
        },
        { $sort: { _id: 1 } }
      ]);
  
      res.json({ bloodAvailability: bloodStock });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  };
  
  

  module.exports = { registerBlood, getBloodStock, checkBloodAvailability, getAllBloodAvailability };