import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { MongoClient } from "mongodb";
import { schema } from "./schema.ts"; // Tu esquema GraphQL
import { resolvers } from "./resolvers.ts"; // Tus resolutores

// Obtiene la URL de MongoDB desde las variables de entorno
const MONGO_URL = Deno.env.get("MONGO_URL");

if (!MONGO_URL) {
  throw new Error("Please provide a valid MONGO_URL environment variable");
}

// Inicializa el cliente MongoDB
const mongoClient = new MongoClient(MONGO_URL);
await mongoClient.connect();
console.info("Connected to MongoDB");

// Obtiene la colección de contactos
const mongoDB = mongoClient.db("contacts_db"); 
const ContactCollection = mongoDB.collection("contacts"); 

// Inicializa el servidor Apollo
const server = new ApolloServer({
  typeDefs: schema, 
  resolvers, 
});

// Configura y arranca el servidor
const { url } = await startStandaloneServer(server, {
  context: async () => ({
    ContactCollection, 
  }),
});

console.info(`Server ready at ${url}`);
