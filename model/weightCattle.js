/** @format */

import mongoose from "mongoose";

// Define the schema
const weightCattle = new mongoose.Schema({
	rfid: {
		type: String,
		required: true,
	},
	weight: {
		type: Number,
		required: true,
	},
	date: {
		type: Date,
		required: true,
	},
	// Add user field to reference the User model
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User", // Refers to the User model
		required: true,
	},
});

// Create the WeightCattle model
const WeightCattle = mongoose.model("WeightCattle", weightCattle);

export default WeightCattle;
