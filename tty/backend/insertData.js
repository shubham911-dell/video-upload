const { MongoClient, ServerApiVersion } = require('mongodb');

// Replace YOUR_PASSWORD with your actual password
const uri = "mongodb+srv://shubhandhaka18:Aassqqww1122hh@cluster0.wsgam39.mongodb.net/?retryWrites=true&w=majority";

async function run() {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,  // Note: "v1" (not "vl")
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to Atlas!");

    // Create/select a database
    const db = client.db("testdb");

    // Insert a document into the "users" collection
    await db.collection("users").insertOne({
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date()
    });
    console.log("Document inserted!");

  } finally {
    // Close the connection
    await client.close();
  }
}

// Run the script and catch errors
run().catch(console.dir);