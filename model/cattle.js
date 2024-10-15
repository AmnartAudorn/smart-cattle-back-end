/** @format */

import mongoose from "mongoose";

const cattleSchema = new mongoose.Schema({
	rfid: {
		type: String,
		required: true,
		unique: true,
	},
	name: {
		type: String,
		required: true,
	},
	gender: {
		type: String,
		required: true,
		enum: ["male", "female"], // Only allow "male" or "female"
	},
	weight: {
		type: Number,
		required: true,
	},
	nid: {
		type: String,
		required: true,
		unique: true,
	},
	lineage: {
		type: String,
		required: true,
	},
	birthDate: {
		type: Date,
		required: true,
	},
	statusCattle: {
		type: String,
		required: true,
	},
	owner: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User", // Foreign key reference to User model
		required: true,
	},
});

// Create and export the model
const Cattle = mongoose.model("Cattle", cattleSchema);
export default Cattle;
