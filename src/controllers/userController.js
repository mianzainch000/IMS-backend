require("dotenv").config();
const User = require("../models/userSchema");
const nodemailer = require("nodemailer");
const ForgetPasswordEmail = require("../emailTemplate");
const { check, validationResult } = require("express-validator");

const {
  verifyToken,
  generateToken,
  comparePassword,
  generateHashPassword,
} = require("../helper/authFunction");

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()[0].msg });
  }

  try {
    const { firstName, lastName, email, password } = req.body;

    let existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // --- LOGIC: Check if this is the first user ---
    const userCount = await User.countDocuments();
    const assignedRole = (userCount === 0) ? "Admin" : "Viewer";
    // ----------------------------------------------

    const hashedPassword = await generateHashPassword(password);

    let user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: assignedRole, // Automatic role assignment
    });

    let result = await user.save();
    result = result.toObject();
    delete result.password;

    res.status(201).send({
      message: `Account created as ${assignedRole}`,
      user: result
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error." });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    let errorMsg = errors.array()[0].msg;
    return res.status(400).json({ errors: errorMsg });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Invalid email" });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    const token = generateToken(
      {
        _id: userResponse._id,
        role: userResponse.role
      },
      process.env.SECRET_KEY,
      process.env.JWT_EXPIRATION,
    );

    return res.status(200).send({
      message: "Login successful",
      user: userResponse,
      token,
      // ✅ include flag for frontend
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    let errorMsg = errors.array()[0].msg;
    return res.status(400).json({ errors: errorMsg });
  }

  try {
    const { email } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Generate JWT token using helper function
    const tokenEmail = generateToken(
      { email },
      process.env.SECRET_KEY,
      process.env.JWT_EXPIRATION_EMAIL,
    );

    // Prepare email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: process.env.OWNER_EMAIL, // Use environment variables
        pass: process.env.OWNER_PASS,
      },
    });

    // Email content
    const html = ForgetPasswordEmail.email(
      process.env.FRONTEND_URL,
      tokenEmail,
    );
    const emailOptions = {
      from: process.env.OWNER_EMAIL,
      to: email,
      subject: "Here's your password reset link!",
      text: "click on Button to Reset ",
      html: html,
    };

    // Send the email
    await transporter.sendMail(emailOptions);

    return res
      .status(200)
      .send({ message: "Password reset email sent successfully." });
  } catch (error) {
    return res.status(500).send({ message: "Internal server error." });
  }
};

exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    let errorMsg = errors.array()[0].msg;
    return res.status(400).json({ errors: errorMsg });
  }

  try {
    const token = req.params.tokenEmail;
    const { newPassword } = req.body;

    // Validate inputs
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    // Verify the token using the helper function
    let decoded;
    try {
      decoded = verifyToken(token, process.env.SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ message: err.message });
    }

    // Extract email from the token
    const { email } = decoded;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password using helper function
    const hashedPassword = await generateHashPassword(newPassword);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in ResetPassword:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// --- SARE USERS KO GET KARNA (Sirf Admin ke liye) ---
exports.getAllUsers = async (req, res) => {
  try {
    // Saare users dhoondhein lekin password hide kar dein
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Users fetch karne mein masla hua." });
  }
};

// --- USER KA ROLE UPDATE KARNA (Viewer -> Editor / Admin) ---
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params; // User ID
    const { role } = req.body; // Naya Role (e.g., "Editor")

    // Role validate karein ke kahin koi ghalat role na bhej de
    const validRoles = ["Admin", "Editor", "Viewer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: role },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User nahi mila." });
    }

    res.status(200).json({
      message: `User role updated to ${role} successfully!`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: "Role update karne mein error aya." });
  }
};

exports.validate = (method) => {
  switch (method) {
    case "signup": {
      return [
        check("firstName")
          .notEmpty()
          .withMessage("First name is required")
          .isAlpha()
          .withMessage("First name must contain only alphabetic characters")
          .custom((value) => value.trim()),
        check("lastName")
          .notEmpty()
          .withMessage("Last name is required")
          .isAlpha()
          .withMessage("Last name must contain only alphabetic characters")
          .custom((value) => value.trim()),
        check("email")
          .notEmpty()
          .withMessage("Email is required")
          .isEmail()
          .withMessage("Please enter a valid email address")
          .custom((value) => value.trim()),
        check("password")
          .notEmpty()
          .withMessage("Password is required")
          .isLength({ min: 4 })
          .withMessage("Password must be at least 4 characters"),
      ];
    }

    case "login": {
      return [
        check("email")
          .notEmpty()
          .withMessage("Email is required")
          .isEmail()
          .withMessage("Please enter a valid email address")
          .custom((value) => value.trim()),
        check("password").notEmpty().withMessage("Password is required"),
      ];
    }

    case "forgotPassword": {
      return [
        check("email")
          .notEmpty()
          .withMessage("Email is required")
          .isEmail()
          .withMessage("Please enter a valid email address")
          .custom((value) => value.trim()),
      ];
    }

    case "resetPassword": {
      return [
        check("newPassword")
          .notEmpty()
          .withMessage("Password is required")
          .isLength({ min: 4 })
          .withMessage("Password must be at least 4 characters"),
      ];
    }
  }
};
