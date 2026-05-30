const express = require("express");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  serialize,
} = require("mongodb");
require("dotenv").config();
const cors = require("cors");
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
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("ScholarStream");
    const usersCollection = db.collection("users");
    const scholarshipsCollection = db.collection("scholarships");
    const applicationsCollection = db.collection("applications");
    const reviewsCollection = db.collection("reviews");

    // Users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email: email });
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "Student";
      user.createdAt = new Date();
      // check if already exists this user
      const existingUser = await usersCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.status(200).send({ message: "User already exists." });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/users/role/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateUserRole = {
        $set: {
          role,
        },
      };
      const result = await usersCollection.updateOne(query, updateUserRole);
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Scholarships
    app.get("/scholarships", async (req, res) => {
      const {
        limit,
        sort,
        search,
        scholarshipCategory,
        subjectCategory,
        location,
      } = req.query;
      const query = {};

      // Search
      if (search) {
        query.$or = [
          {
            scholarshipName: {
              $regex: search,
              $options: "i",
            },
          },
          {
            universityName: {
              $regex: search,
              $options: "i",
            },
          },
          {
            degree: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      //  All Scholarships Filter
      if (scholarshipCategory) {
        query.scholarshipCategory = scholarshipCategory;
      }
      if (subjectCategory) {
        query.subjectCategory = subjectCategory;
      }
      if (location) {
        query.universityCountry = location;
      }

      //  Top Scholarship Sort
      let sortOption = {};
      if (sort === "latest") {
        sortOption = {
          scholarshipPostDate: -1,
        };
      } else if (sort === "lowestFee") {
        sortOption = {
          applicationFees: 1,
        };
      } else {
        sortOption = {
          scholarshipPostDate: -1,
        };
      }
      // Top Scholarship Limit
      let cursor = scholarshipsCollection.find(query).sort(sortOption);
      if (limit) {
        cursor = cursor.limit(parseInt(limit));
      }

      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipsCollection.findOne(query);
      res.send(result);
    });
    app.post("/scholarships", async (req, res) => {
      const newScholarships = req.body;

      newScholarships.createdAt = new Date();
      const result = await scholarshipsCollection.insertOne(newScholarships);
      res.send(result);
    });

    // Reviews
    app.get("/reviews/:scholarshipId", async (req, res) => {
      const scholarshipId = req.params.scholarshipId;
      const result = await reviewsCollection
        .find({ scholarshipId })
        .sort({ reviewDate: -1 })
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ScholarStream is connected!");
});

app.listen(port, () => {
  console.log(`ScholarSteam is running on port: ${port}`);
});
