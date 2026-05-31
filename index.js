const express = require("express");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  serialize,
} = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const paymentsCollection = db.collection("payments");

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
    app.patch("/scholarships/:id", async (req, res) => {
      const id = req.params.id;

      const updatedData = req.body;

      delete updatedData._id;

      const result = await scholarshipsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updatedData,
        },
      );

      res.send(result);
    });
    app.delete("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipsCollection.deleteOne(query);
      res.send(result);
    });

    // Applications
    app.get("/applications", async (req, res) => {
      const email = req.query.email;

      const query = {};

      if (email) {
        query.applicantEmail = email;
      }

      const result = await applicationsCollection
        .find(query)
        .sort({ appliedAt: -1 })
        .toArray();

      res.send(result);
    });
    app.get("/applications/:id", async (req, res) => {
      const id = req.params.id;

      const result = await applicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });
    app.post("/applications", async (req, res) => {
      const application = req.body;

      application.paymentStatus = "unpaid";

      application.applicationStatus = "pending";

      application.feedback = "";

      application.appliedAt = new Date();

      const result = await applicationsCollection.insertOne(application);

      res.send(result);
    });
    app.patch("/applications/status/:id", async (req, res) => {
      const id = req.params.id;

      const { status } = req.body;

      const result = await applicationsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            applicationStatus: status,
          },
        },
      );

      res.send(result);
    });
    app.patch("/applications/feedback/:id", async (req, res) => {
      const id = req.params.id;

      const { feedback } = req.body;

      const result = await applicationsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            feedback,
          },
        },
      );

      res.send(result);
    });
    app.delete("/applications/:id", async (req, res) => {
      const id = req.params.id;

      const result = await applicationsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // Reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection
        .find()
        .sort({ reviewDate: -1 })
        .toArray();

      res.send(result);
    });
    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;

      const result = await reviewsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });
    app.get("/reviews/:scholarshipId", async (req, res) => {
      const scholarshipId = req.params.scholarshipId;
      const result = await reviewsCollection
        .find({ scholarshipId })
        .sort({ reviewDate: -1 })
        .toArray();
      res.send(result);
    });
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      review.reviewDate = new Date();

      const result = await reviewsCollection.insertOne(review);

      res.send(result);
    });
    app.patch("/reviews/:id", async (req, res) => {
      const id = req.params.id;

      const { ratingPoint, reviewComment } = req.body;

      const result = await reviewsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            ratingPoint,
            reviewComment,
            reviewDate: new Date(),
          },
        },
      );

      res.send(result);
    });
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;

      const result = await reviewsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    //  My Reviews
    app.get("/my-reviews", async (req, res) => {
      const email = req.query.email;

      const result = await reviewsCollection
        .find({ userEmail: email })
        .sort({ reviewDate: -1 })
        .toArray();

      res.send(result);
    });

    // Admin
    app.get("/admin-stats", async (req, res) => {
      const totalUsers = await usersCollection.countDocuments();

      const totalScholarships = await scholarshipsCollection.countDocuments();

      const totalApplications = await applicationsCollection.countDocuments();

      res.send({
        totalUsers,
        totalScholarships,
        totalApplications,
      });
    });
    app.get("/analytics/scholarship-category", async (req, res) => {
      const result = await scholarshipsCollection
        .aggregate([
          {
            $group: {
              _id: "$scholarshipCategory",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      res.send(result);
    });

    // Payment
    app.post("/create-checkout-session", async (req, res) => {
      try {
        const paymentInfo = req.body;

        console.log("Payment Info:", paymentInfo);

        const amount = parseInt(paymentInfo.amount) * 100;

        console.log("Amount:", amount);

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],

          line_items: [
            {
              price_data: {
                currency: "usd",

                product_data: {
                  name: paymentInfo.scholarshipName,
                },

                unit_amount: amount,
              },

              quantity: 1,
            },
          ],

          mode: "payment",

          customer_email: paymentInfo.email,

          metadata: {
            applicationId: paymentInfo.applicationId,
          },

          success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-failed`,
        });

        res.send({ url: session.url });
      } catch (error) {
        console.log("STRIPE ERROR:", error);

        res.status(400).send({
          message: error.message,
        });
      }
    });
    app.patch("/payment-success", async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).send({
        success: false,
        message: "Session ID is required",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.send({
        success: false,
        message: "Payment not completed",
      });
    }

    const applicationId = session.metadata.applicationId;

    const application = await applicationsCollection.findOne({
      _id: new ObjectId(applicationId),
    });

    if (!application) {
      return res.status(404).send({
        success: false,
        message: "Application not found",
      });
    }

    // Prevent duplicate updates
    if (application.paymentStatus === "paid") {
      return res.send({
        success: true,
        message: "Payment already processed",
      });
    }

    const result = await applicationsCollection.updateOne(
      {
        _id: new ObjectId(applicationId),
      },
      {
        $set: {
          paymentStatus: "paid",
          paymentDate: new Date(),
          stripeSessionId: session.id,
        },
      }
    );

    res.send({
      success: true,
      message: "Payment processed successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("PAYMENT SUCCESS ERROR:", error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
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
