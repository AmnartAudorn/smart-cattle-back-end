/** @format */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Define user schema
const userSchema = new mongoose.Schema({
	farmName: {
		type: String,
		required: true,
	},
	firstName: {
		type: String,
		required: true,
	},
	lastName: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		match: [/.+\@.+\..+/, "Invalid email format"],
	},
	password: {
		type: String,
		required: true,
		minlength: 6,
	},
	phoneNumber: {
		type: String,
		required: true,
	},
	dateCreated: {
		type: Date,
		default: Date.now,
	},
	address: {
		type: String,
		required: true,
	},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
});

// Hash password before saving the user
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
	next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
	return await bcrypt.compare(candidatePassword, this.password);
};

// Generate a password reset token
userSchema.methods.createPasswordResetToken = function () {
	const resetToken = crypto.randomBytes(20).toString("hex");

	this.resetPasswordToken = resetToken;
	this.resetPasswordExpires = Date.now() + 3600000; // 1 hour

	return resetToken;
};

// Check if reset token is valid
userSchema.methods.isResetTokenValid = function (token) {
	return this.resetPasswordToken === token && this.resetPasswordExpires > Date.now();
};

// Create and export user model
const user = mongoose.model("user", userSchema);
export default user;
