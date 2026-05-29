const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.i9wlk8b.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("ScholarStream");
    const usersCollection = db.collection("users");
    const scholarshipsCollection = db.collection("scholarships");

    // Users
    app.get("/users", async(req, res) => {
        const query = {}
        const result = await usersCollection.find(query).toArray();
        res.send(result);
    })
    app.get("/users/:id", async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await usersCollection.findOne(query);
        res.send(result);
    })
    app.post("/users", async(req, res) => {
        const user = req.body;

        // check if already exists this user
        const existingUser = await usersCollection.findOne({email: user.email});

        if(existingUser) {
            return res.send({message: "User already exists."})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
    })

    // Scholarships
    app.get("/scholarships", async(req, res) => {
        const query = {};
        const result = await scholarshipsCollection.find(query).toArray();
        res.send(result);
    })
    app.post("/scholarships", async(req, res) => {
        const newScholarships = req.body;

        newScholarships.createdAt = new Date();
        const result = await scholarshipsCollection.insertOne(newScholarships);
        res.send(result);
    })







    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("ScholarStream is connected!");
})

app.listen(port, () => {
    console.log(`ScholarSteam is running on port: ${port}`);
})