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
        const reviewCollection = database.collection("reviews");
        const usersCollection = database.collection("user");


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

        // get properties for search
        app.get("/api/properties", async (req, res) => {
            try {
                const { location, type, sort } = req.query;
                let query = {};

                
                if (location) {
                    query.location = { $regex: location, $options: 'i' };
                }

                if (type) {
                    query.propertyType = type;
                }

                let sortOption = {};
                if (sort === "price-low") sortOption.rent = 1;
                if (sort === "price-high") sortOption.rent = -1;

                
                console.log("MongoDB Query:", query);
                const properties = await propertyCollection.find(query).sort(sortOption).toArray();
                console.log("Properties Found Count:", properties.length);

                res.send(properties);
            } catch (error) {
                res.status(500).send({ message: "Error fetching properties" });
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

        //  for delete favorites 
        app.delete("/api/favorites/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await favoriteCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error deleting favorite", error });
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


        // Update Booking Status Route
        app.patch("/api/bookings/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const { status } = req.body;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: { status: status },
                };

                const result = await bookingCollection.updateOne(filter, updateDoc);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Booking not found" });
                }

                res.send({ message: "Booking status updated successfully", result });
            } catch (error) {
                res.status(500).send({ message: "Error updating booking status", error });
            }
        });

        // Get Booking Status Route

        app.get("/api/bookings/:email", async (req, res) => {
            try {
                const userEmail = req.params.email;
                // console.log("Searching for bookings for email:", userEmail); 
                const query = { userEmail: userEmail };
                const result = await bookingCollection.find(query).toArray();

                // console.log("Found bookings:", result); 
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching bookings", error });
            }
        });


        // Get All Booking Status Route
        app.get('/api/admin/bookings', async (req, res) => {
            try {
                const bookings = await database.collection("bookings").find().toArray();
                res.send(bookings);
            } catch (error) {
                res.status(500).send({ message: "Error fetching all bookings" });
            }
        });


        // Get booking-requests Status Route
        app.get("/api/owner/bookings-requests/:email", async (req, res) => {
            try {
                const ownerEmail = req.params.email;

                const result = await bookingCollection.find({ ownerEmail: ownerEmail }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching owner bookings" });
            }
        });


        //------------- review related api------------------------

        // Get reviews for a specific property
        app.get("/api/reviews/:propertyId", async (req, res) => {
            try {
                const query = { propertyId: req.params.propertyId };
                const result = await reviewCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching reviews", error });
            }
        });

        // Post a new review
        app.post("/api/reviews", async (req, res) => {
            try {
                const reviewData = req.body;
                const result = await reviewCollection.insertOne({
                    ...reviewData,
                    date: new Date()
                });
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ message: "Error saving review", error });
            }
        });


        //------------- tenant dashboard overview related api------------------------

        app.get("/api/user/dashboard-stats/:email", async (req, res) => {
            const email = req.params.email;
            try {
                const bookings = await bookingCollection.find({ userEmail: email }).toArray();
                const favorites = await favoriteCollection.find({ userEmail: email }).toArray(); // 


                const activeRentals = bookings.filter(b => b.status === 'Approved');

                res.json({
                    totalBookings: bookings.length,
                    favoritesCount: favorites.length,
                    activeRentals: activeRentals.length,
                    recentActivities: bookings.slice(-4).reverse()
                });
            } catch (error) {
                res.status(500).send({ message: "Error fetching stats" });
            }
        });


        // --- All Users related API ---

        app.get('/api/users', async (req, res) => {
            try {
                const users = await database.collection("user").find().toArray();
                res.send(users);
            } catch (error) {
                res.status(500).send({ message: "Error fetching users" });
            }
        });


        app.patch('/api/users/role/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { role } = req.body;
                const result = await database.collection("user").updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: role } }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error updating role" });
            }
        });


        //------------- Admin dashboard overview related api------------------------
        app.get("/api/admin/overview", async (req, res) => {
            try {
                const totalUsers = await usersCollection.estimatedDocumentCount();
                const totalProperties = await propertyCollection.estimatedDocumentCount();
                const totalBookings = await bookingCollection.estimatedDocumentCount();

                const earnings = await bookingCollection.aggregate([
                    { $match: { status: "Approved" } },
                    { $group: { _id: null, total: { $sum: "$amountPaid" } } }
                ]).toArray();

                const data = {
                    totalUsers,
                    totalProperties,
                    totalBookings,
                    totalEarnings: earnings.length > 0 ? earnings[0].total : 0
                };

                // console.log("Fetched Data:", data);  
                res.send(data);
            } catch (error) {
                console.error("API Error:", error);
                res.status(500).send({ message: "Error" });
            }
        });


        //------------- owner dashboard overview related api------------------------

        app.get("/api/owner/overview/:email", async (req, res) => {
            try {
                const ownerEmail = req.params.email;


                const bookings = await bookingCollection.find({ ownerEmail: ownerEmail }).toArray();
                const totalProperties = await propertyCollection.countDocuments({ ownerEmail: ownerEmail });


                const approvedBookings = bookings.filter(b => b.status === "Approved");
                const totalEarnings = approvedBookings.reduce((sum, b) => sum + (Number(b.amountPaid) || 0), 0);


                const last12Months = Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    return d.toLocaleString('default', { month: 'short' });
                }).reverse();

                const monthlyMap = approvedBookings.reduce((acc, b) => {
                    const month = new Date(b.createdAt).toLocaleString('default', { month: 'short' });
                    acc[month] = (acc[month] || 0) + (Number(b.amountPaid) || 0);
                    return acc;
                }, {});

                const formattedMonthlyData = last12Months.map(month => ({
                    month,
                    earnings: monthlyMap[month] || 0
                }));

                res.send({
                    totalBookings: approvedBookings.length,
                    totalEarnings: totalEarnings,
                    totalProperties: totalProperties,
                    monthlyData: formattedMonthlyData
                });
            } catch (error) {
                console.error("Error fetching analytics:", error);
                res.status(500).send({ message: "Error fetching analytics" });
            }
        });




        // await client.db("admin").command({ ping: 1 });
        console.log("You successfully connected to MongoDB!");
    } catch (err) {
        console.error(err);
    }
}
run().catch(console.dir);

