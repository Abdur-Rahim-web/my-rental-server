const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.MONGO_DB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const database = client.db(process.env.DB_NAME);
        const propertyCollection = database.collection("property");

        // Server-side: API route to get properties by owner email
        app.get('/api/properties', async (req, res) => {
            try {
                const { ownerEmail } = req.query; // ফ্রন্টএন্ড থেকে ইমেইল পাঠাতে হবে
                console.log("Searching in DB for:", ownerEmail);
                const query = ownerEmail ? { ownerEmail: ownerEmail } : {};

                const result = await propertyCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching properties", error });
            }
        });

        // Property Post Route
        app.post("/api/property", async (req, res) => {
            try {
                const property = req.body;
                const result = await propertyCollection.insertOne(property);
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ message: "Error saving property", error });
            }
        });

        // Update Property Route (PATCH)
        app.patch("/api/properties/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;

                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: updatedData,
                };

                const result = await propertyCollection.updateOne(filter, updateDoc);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Property not found" });
                }

                res.send({ message: "Property updated successfully", result });
            } catch (error) {
                res.status(500).send({ message: "Error updating property", error });
            }
        });

        // Delete Property Route (DELETE)
        app.delete("/api/properties/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };

                const result = await propertyCollection.deleteOne(query);

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Property not found" });
                }

                res.send({ message: "Property deleted successfully", result });
            } catch (error) {
                res.status(500).send({ message: "Error deleting property", error });
            }
        });

        await client.db("admin").command({ ping: 1 });
        console.log("You successfully connected to MongoDB!");
    } catch (err) {
        console.error(err);
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});