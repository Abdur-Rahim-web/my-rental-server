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
        const favoriteCollection = database.collection("favorites");
        const bookingCollection = database.collection("bookings");


        //------------- properties related api------------------------

        // Server-side: API route to get properties by owner email
        app.get('/api/properties', async (req, res) => {
            try {
                const { ownerEmail } = req.query;
                // console.log("Searching in DB for:", ownerEmail);
                const query = ownerEmail ? { ownerEmail: ownerEmail } : {};

                const result = await propertyCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching properties", error });
            }
        });

        // featured-properties
        app.get('/api/featured-properties', async (req, res) => {
            try {
                const query = { status: 'Approved' };
                const result = await propertyCollection
                    .find(query)
                    .limit(6)
                    .toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching featured properties", error });
            }
        });

        // Property Details api 
        app.get('/api/properties/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await propertyCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: "Property not found in DB" });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Invalid ID format or Server Error" });
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
            console.log("Delete route hit with ID:", req.params.id);
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


        //------------- favorites related api------------------------

        // post for add-favorites property
        app.post("/api/favorites", async (req, res) => {
            try {
                const favoriteData = req.body;
                const query = { propertyId: favoriteData.propertyId, userEmail: favoriteData.userEmail };
                const existing = await favoriteCollection.findOne(query);

                if (existing) {
                    return res.status(400).send({ message: "Already in favorites" });
                }

                const result = await favoriteCollection.insertOne(favoriteData);
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ message: "Error adding to favorites", error });
            }
        });

        // get for add-favorites property
        app.get("/api/favorites/:email", async (req, res) => {
            try {
                const query = { userEmail: req.params.email };
                const result = await favoriteCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching favorites", error });
            }
        });

        //------------- booking related api------------------------
        app.post("/api/bookings", async (req, res) => {
            try {
                const bookingData = req.body;
                const result = await bookingCollection.insertOne({
                    ...bookingData,
                    status: 'Pending',
                    createdAt: new Date()
                });
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ message: "Error saving booking", error });
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