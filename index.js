/** @format */
import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import dbConfig from "./db.js";
import api from "./routes/Api.routes.js";
import bodyParser from "body-parser";
import authMiddleware from "./authMiddleware.js"; // Adjust the path as needed

mongoose.Promise = global.Promise;
mongoose
	.connect(dbConfig.db, {
		useNewUrlParser: true,
	})
	.then(
		() => {
			console.log("Database successfully connented");
		},
		(error) => {
			console.log("Database successfully connented" + error);
		}
	);

const app = express();

app.use(cors());

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", api);

const PORT = process.env.PORT || "3001";

// Secure route example
app.get("/api/secure-data", authMiddleware, (req, res) => {
	res.status(200).json({ data: "This is secure data" });
});

app.get("/health", (req, res) => {
	res.status(200).send("Server is health");
});

app.listen(PORT, () => {
	console.log(`server is running on port : ${PORT}`);
});

export default app;
