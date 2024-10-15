/** @format */

import express from "express";
import user from "../model/user.js";
import cattle from "../model/cattle.js";
import WeightCattle from "../model/weightCattle.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // Make sure to import bcrypt
import axios from "axios";

const JWT_SECRET = "qwertyuiop"; // Store this securely in an environment variable

const router = express.Router();

router.route("/login").post(async (req, res, next) => {
	const { email, password } = req.body;

	try {
		const userLogin = await user.findOne({ email });
		if (!user) {
			return res.status(401).json({ message: "Invalid email " });
		}

		const isMatch = await bcrypt.compare(password, userLogin.password);
		if (!isMatch) {
			return res.status(401).json({ message: "Invalid password" });
		}

		const token = jwt.sign({ id: userLogin._id, email: userLogin.email }, JWT_SECRET, { expiresIn: "1h" });

		res.status(200).json({ message: "Login successful", token });
	} catch (err) {
		console.error("Error during login:", err);
		res.status(500).json({ message: "Server error" });
	}
});

router.route("/get-user-by-email/:email").get(async (req, res) => {
	try {
		const { email } = req.params;

		// Find user by email
		const userEmail = await user.findOne({ email });
		if (!userEmail) {
			return res.status(404).json({ message: "User not found." });
		}

		res.status(200).json(userEmail);
	} catch (err) {
		console.error("Error fetching cattle by email:", err);
		res.status(500).json({ message: "Internal server error." });
	}
});

router.route("/create-user").post(async (req, res) => {
	try {
		const newUser = await user.create(req.body);
		const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: "1h" });

		newUser.jwtToken = token;
		await newUser.save();

		res.status(201).json({ message: "User registered successfully", token });
	} catch (err) {
		if (err.code === 11000) {
			const field = Object.keys(err.keyValue)[0];
			const errorMessage = `The ${field} '${err.keyValue[field]}' is already in use.`;
			return res.status(400).json({ message: errorMessage });
		}
		res.status(400).json({ message: "Bad request. Please check the form data." });
	}
});

router.route("/update-user/:id").put(async (req, res) => {
	try {
		const userId = req.params.id; // Get the user ID from the request parameters
		const updatedUser = await user.findByIdAndUpdate(userId, req.body, { new: true, runValidators: true });

		if (!updatedUser) {
			return res.status(404).json({ message: "User not found." });
		}

		res.status(200).json({ message: "User updated successfully", user: updatedUser });
	} catch (err) {
		if (err.code === 11000) {
			const field = Object.keys(err.keyValue)[0];
			const errorMessage = `The ${field} '${err.keyValue[field]}' is already in use.`;
			return res.status(400).json({ message: errorMessage });
		}
		res.status(400).json({ message: "Bad request. Please check the form data." });
	}
});

router.post("/create-cattle", async (req, res) => {
	try {
		const { owner, ...cattleData } = req.body; // Extract email and cattle data from request body
		console.log(owner);
		// Find user by email
		const userEmail = await user.findOne({ email: owner });
		console.log(userEmail);
		if (!userEmail) {
			return res.status(404).json({ message: "User not found." });
		}
		console.log(userEmail);
		// Create a new cattle object with owner set to the user's ID
		const newcattle = new cattle({
			...cattleData,
			owner: userEmail._id,
		});
		console.log(newcattle);
		// Save the new cattle to the database
		await newcattle.save();

		await notifyLineCreate(newcattle);

		// Respond with success
		res.status(201).json({ message: "cattle added successfully", cattle: newcattle });
	} catch (err) {
		console.error("Error adding cattle:", err);
		res.status(400).json({ message: "Error adding cattle", error: err.message });
	}
});

router.get("/get-cattle-by-email/:email", async (req, res) => {
	try {
		const { email } = req.params;
		console.log(email);

		// Find user by email
		const userEmail = await user.findOne({ email });
		console.log(userEmail);

		if (!userEmail) {
			return res.status(404).json({ message: "User not found." });
		}

		// Find cattle owned by the user
		const cattleList = await cattle.find({ owner: userEmail._id });

		if (!cattleList || cattleList.length === 0) {
			return res.status(404).json({ message: "No cattle found for this email." });
		}

		res.status(200).json(cattleList);
	} catch (err) {
		console.error("Error fetching cattle by email:", err);
		res.status(500).json({ message: "Internal server error." });
	}
});

router.post("/get-cattle-by-email", async (req, res) => {
	try {
		const { email, statusCattle } = req.body; // Get email and statusCattle from the request body
		console.log(email, statusCattle);

		// Find user by email
		const userEmail = await user.findOne({ email });
		console.log(userEmail);

		if (!userEmail) {
			return res.status(404).json({ message: "User not found." });
		}

		// Build the query for cattle
		const cattleQuery = {
			owner: userEmail._id,
			...(statusCattle && { statusCattle }), // Include statusCattle if it's provided
		};

		// Find cattle owned by the user and filter by statusCattle if provided
		const cattleList = await cattle.find(cattleQuery);

		if (!cattleList || cattleList.length === 0) {
			return res.status(404).json({ message: "No cattle found for this email and status." });
		}

		res.status(200).json(cattleList);
	} catch (err) {
		console.error("Error fetching cattle by email and status:", err);
		res.status(500).json({ message: "Internal server error." });
	}
});

router.put("/update-cattle/:id", async (req, res) => {
	try {
		const updatedcattle = await cattle.findByIdAndUpdate(req.params.id, req.body, { new: true });
		if (!updatedcattle) {
			return res.status(404).json({ message: "cattle not found" });
		}
		notifyLineUpdate(updatedcattle);
		res.status(200).json({ message: "cattle updated successfully", cattle: updatedcattle });
	} catch (err) {
		res.status(400).json({ message: "Error updating cattle", error: err.message });
	}
});

router.delete("/delete-cattle/:id", async (req, res) => {
	try {
		const deletedcattle = await cattle.findByIdAndDelete(req.params.id);
		if (!deletedcattle) {
			return res.status(404).json({ message: "cattle not found" });
		}
		res.status(200).json({ message: "cattle deleted successfully" });
	} catch (err) {
		res.status(400).json({ message: "Error deleting cattle", error: err.message });
	}
});

router.post("/request-password-reset", async (req, res) => {
	const { email } = req.body;
	try {
		const userEmail = await user.findOne({ email });
		if (!userEmail) {
			return res.status(400).json({ message: "User with this email does not exist." });
		}

		const token = jwt.sign({}, JWT_SECRET, { expiresIn: "1d" });
		userEmail.resetPasswordToken = token;
		userEmail.resetPasswordExpires = Date.now() + 3600000;
		await userEmail.save();

		const resetURL = `reset-password/${token}`;
		console.log(resetURL);

		return res.status(200).json({ resetURL });
	} catch (error) {
		console.error("Error sending email:", error);
		return res.status(500).json({ message: "Server error." });
	}
});

router.post("/reset-password", async (req, res) => {
	const { token, password } = req.body;

	try {
		// Find user by reset token and check if it has not expired
		const userRe = await user.findOne({
			resetPasswordToken: token,
			resetPasswordExpires: { $gt: Date.now() },
		});

		console.log("password1:", password);

		if (!userRe) {
			return res.status(400).json({ message: "Password reset token is invalid or has expired." });
		}

		userRe.password = password;
		userRe.resetPasswordToken = undefined;
		userRe.resetPasswordExpires = undefined;

		await userRe.save();

		res.status(200).json({ message: "Password has been reset successfully." });
	} catch (error) {
		console.error("Error in resetting password:", error);
		res.status(500).json({ message: "Server error" });
	}
});

async function notifyLineCreate(cattle) {
	const userOwner = await user.findById(cattle.owner); // Added 'await' to ensure the promise resolves before use
	console.log(cattle.birthDate);
	const birthDate = calculateAge(cattle.birthDate);
	console.log(birthDate);
	const token = "RNyELf1LoRTTGSTLxyCHnwr3PEe0mOtxYPfB2EhSiWC";

	const message = `${userOwner.email} successfully created the cattle!\nRFID: ${cattle.rfid}\nCattle Name: ${cattle.name}\nGender: ${cattle.gender}\nAge: ${birthDate.years} years ${birthDate.months} months  ${birthDate.days} day \nLineage: ${cattle.lineage}\nWeight: ${cattle.weight} Kg`;
	console.log(message);

	try {
		await axios.post(
			"https://notify-api.line.me/api/notify",
			new URLSearchParams({
				message: message,
			}),
			{
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
			}
		);
		console.log("LINE notification sent successfully!");
	} catch (error) {
		console.error("Error sending LINE notification:", error.message);
	}
}

async function notifyLineUpdate(cattles) {
	console.log("newcattle:" + cattles);

	const userOwner = await user.findOne(cattles.owner);
	console.log("userOwner:" + userOwner);

	const birthDate = calculateAge(cattles.birthDate);

	const token = "RNyELf1LoRTTGSTLxyCHnwr3PEe0mOtxYPfB2EhSiWC";

	const message = `${userOwner.email} successfully updated the cattle!\nRFID: ${cattles.rfid}\nCattle Name: ${cattles.name}\nGender: ${cattles.gender}\nAge: ${birthDate.years} years ${birthDate.months} months  ${birthDate.days} day \nLineage: ${cattles.lineage}\nWeight: ${cattles.weight} Kg`;

	console.log(message);

	try {
		await axios.post(
			"https://notify-api.line.me/api/notify",
			new URLSearchParams({
				message: message,
			}),
			{
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
			}
		);
		console.log("LINE notification sent successfully!");
	} catch (error) {
		console.error("Error sending LINE notification:", error.message);
	}
}

function calculateAge(birthDate) {
	const today = new Date();
	const birth = new Date(birthDate);

	// Calculate the difference in years, months, and days
	let years = today.getFullYear() - birth.getFullYear();
	let months = today.getMonth() - birth.getMonth();
	let days = today.getDate() - birth.getDate();

	// Adjust for negative months
	if (months < 0) {
		years--;
		months += 12;
	}

	// Adjust for negative days
	if (days < 0) {
		months--;
		const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate(); // Get last day of the previous month
		days += lastMonth;
	}

	return { years, months, days };
}

router.get("/getCattleRecords", async (req, res) => {
	try {
		const cattleRecords = await WeightCattle.find();
		res.json(cattleRecords);
	} catch (error) {
		res.status(400).json({ message: "Error fetching cattle records", error });
	}
});

router.post("/addCattleRecords", async (req, res) => {
	try {
		const { rfid, weight, date, user } = req.body;

		// Create a new cattle record
		const cattleRecord = await WeightCattle.create({
			rfid,
			weight,
			date,
			user, // Save the user ID reference
		});

		res.json(cattleRecord);
	} catch (error) {
		res.status(400).json({ message: "Error adding cattle record", error });
	}
});

router.get("/getByRFIDAndEmail", async (req, res) => {
	try {
		const { rfid, email } = req.query;

		// Find the cattle record by RFID and email
		const cattleRecord = await WeightCattle.findOne({ rfid, email });

		if (!cattleRecord) {
			return res.status(404).json({ message: "Cattle record not found" });
		}

		// Return the cattle record
		res.json(cattleRecord);
	} catch (error) {
		res.status(400).json({ message: "Error fetching cattle record", error });
	}
});

export default router;
