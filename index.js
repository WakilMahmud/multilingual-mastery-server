require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECTRET_KEY);
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hgdpfd2.mongodb.net/?retryWrites=true&w=majority`;

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
		const usersCollection = client.db("multilingualMastery").collection("users");
		const classesCollection = client.db("multilingualMastery").collection("classes");
		const registerClassesCollection = client.db("multilingualMastery").collection("registerClasses");
		const paymentCollection = client.db("multilingualMastery").collection("payments");
		const popularCollection = client.db("multilingualMastery").collection("popular");

		//user apis
		app.get("/users", async (req, res) => {
			const queryEmail = req.query.email;
			// console.log(queryEmail);

			if (queryEmail) {
				const query = { email: queryEmail };
				const desiredUser = await usersCollection.findOne(query);
				return res.send(desiredUser);
			}

			const result = await usersCollection.find().toArray();
			res.send(result);
		});

		app.post("/users", async (req, res) => {
			const user = req.body;

			const query = { email: user.email };
			const existingUser = await usersCollection.findOne(query);

			if (existingUser) {
				return res.send({ message: "user already exists" });
			}

			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

		app.patch("/users/admin/:id", async (req, res) => {
			const id = req.params.id;
			// console.log(id);
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: "admin",
				},
			};

			const result = await usersCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		app.get("/users/instructor", async (req, res) => {
			const query = { role: "instructor" };
			const result = await usersCollection.find(query).toArray();
			res.send(result);
		});

		app.patch("/users/instructor/:id", async (req, res) => {
			const id = req.params.id;
			// console.log(id);
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: "instructor",
				},
			};

			const result = await usersCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		// classes apis
		app.get("/classes", async (req, res) => {
			const email = req.query.email;
			// console.log(email);

			if (email) {
				const query = { instructorEmail: email };

				const desiredInstructorClasses = await classesCollection.find(query).toArray();

				return res.send(desiredInstructorClasses);
			}
			const result = await classesCollection.find().toArray();
			res.send(result);
		});

		app.get("/approved-classes", async (req, res) => {
			const query = { status: "approved" };
			const result = await classesCollection.find(query).toArray();
			res.send(result);
		});

		app.post("/classes", async (req, res) => {
			const classInfo = req.body;
			const result = await classesCollection.insertOne(classInfo);
			res.send(result);
		});

		app.patch("/classes/admin/:id", async (req, res) => {
			const id = req.params.id;
			const status = req.query.status;
			// console.log(id);
			// console.log(status);
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					status: status,
				},
			};

			const result = await classesCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		//registerClasses
		app.get("/register-classes", async (req, res) => {
			const email = req.query.email;
			const query = { userEmail: email, status: "booked" };
			const result = await registerClassesCollection.find(query).toArray();
			res.send(result);
		});

		//enrolled classes
		app.get("/enrolled-classes", async (req, res) => {
			const email = req.query.email;
			const query = { userEmail: email, status: "enrolled" };
			const result = await registerClassesCollection.find(query).toArray();
			res.send(result);
		});

		// TODO: Insert One Time
		app.post("/register-classes", async (req, res) => {
			const classInfo = req.body;
			const result = await registerClassesCollection.insertOne(classInfo);
			res.send(result);
		});

		app.delete("/register-classes/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await registerClassesCollection.deleteOne(query);
			res.send(result);
		});

		//create payment intent
		app.post("/create-payment-intent", async (req, res) => {
			const { price } = req.body;
			// console.log(price);
			const amount = parseFloat(price) * 100;
			// console.log(amount);
			// Create a PaymentIntent with the order amount and currency
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: "usd",
				payment_method_types: ["card"],
			});

			res.send({
				clientSecret: paymentIntent.client_secret,
			});
		});

		app.post("/payments", async (req, res) => {
			const payment = req.body;
			const insertResult = await paymentCollection.insertOne(payment);

			res.send(insertResult);
		});

		app.patch("/payments", async (req, res) => {
			const id = req.query.id;

			const filter = {
				_id: new ObjectId(id),
			};

			const updateDoc = {
				$set: {
					status: "enrolled",
				},
				$inc: {
					availableSeats: -1,
				},
			};

			const result = await registerClassesCollection.updateOne(filter, updateDoc);

			res.send(result);
		});

		//popular-classes

		// Retrieve top 6 classes based on student count
		app.get("/popular-classes", async (req, res) => {
			const popularClasses = await popularCollection.find().sort({ enrolledStudents: -1 }).limit(6).toArray();

			res.send(popularClasses);
		});

		app.post("/popular-classes", async (req, res) => {
			const popularClass = req.body;
			const result = await popularCollection.insertOne(popularClass);

			res.send(result);
		});

		app.patch("/popular-classes", async (req, res) => {
			const className = req.query.className;
			const instructorEmail = req.query.instructorEmail;

			const filter = {
				className,
				instructorEmail,
			};

			const updateDoc = {
				$inc: {
					enrolledStudents: 1,
				},
			};

			const result = await popularCollection.updateOne(filter, updateDoc);
			return result;
		});

		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("Server is running");
});

app.listen(port, () => {
	console.log(`Server is running on port: ${port}`);
});
