require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
			console.log(email);

			const query = { instructorEmail: email };

			const desiredInstructorClasses = await classesCollection.find(query).toArray();

			res.send(desiredInstructorClasses);
		});

		app.post("/classes", async (req, res) => {
			const classInfo = req.body;
			const result = await classesCollection.insertOne(classInfo);
			res.send(result);
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
