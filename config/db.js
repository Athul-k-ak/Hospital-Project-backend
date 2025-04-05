const mongoose = require("mongoose");

const connectDB = async () => {
  const options = {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  };

  let retries = 3;

  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, options);
      console.log("MongoDB Connected");
      break; // Exit loop if successful
    } catch (error) {
      console.error(`Database connection failed. Retries left: ${retries - 1}`, error);
      retries -= 1;
      if (retries === 0) {
        console.error("MongoDB connection failed after multiple attempts");
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 5000)); // Wait before retrying
    }
  }
};

module.exports = connectDB;
