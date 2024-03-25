import { MongoClient, ServerApiVersion } from "mongodb";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(process.env.MONGODB_URL ?? "", {
  serverApi: {
    version: ServerApiVersion.v1,
    deprecationErrors: true,
  },
});
