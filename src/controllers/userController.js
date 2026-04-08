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

    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? "Admin" : "Viewer";

    const hashedPassword = await generateHashPassword(password);

    let user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: assignedRole,
      status: "Active",
    });

    let result = await user.save();
    result = result.toObject();
    delete result.password;

    res.status(201).send({
      message: `Account created as ${assignedRole}`,
      user: result,
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error." });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()[0].msg });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Invalid email" });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({
        message: "Your account is Inactive. Please contact Admin.",
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    const token = generateToken(
      { _id: userResponse._id, role: userResponse.role },
      process.env.SECRET_KEY,
      process.env.JWT_EXPIRATION,
    );

    return res.status(200).send({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error." });
  }
};

exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()[0].msg });
  }

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const tokenEmail = generateToken(
      { email },
      process.env.SECRET_KEY,
      process.env.JWT_EXPIRATION_EMAIL,
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: process.env.OWNER_EMAIL,
        pass: process.env.OWNER_PASS,
      },
    });

    const html = ForgetPasswordEmail.email(
      process.env.FRONTEND_URL,
      tokenEmail,
    );
    const emailOptions = {
      from: process.env.OWNER_EMAIL,
      to: email,
      subject: "Password Reset Link",
      html: html,
    };

    await transporter.sendMail(emailOptions);
    return res.status(200).send({ message: "Reset email sent successfully." });
  } catch (error) {
    return res.status(500).send({ message: "Internal server error." });
  }
};

exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()[0].msg });
  }

  try {
    const token = req.params.tokenEmail;
    const { newPassword } = req.body;

    let decoded = verifyToken(token, process.env.SECRET_KEY);
    const { email } = decoded;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await generateHashPassword(newPassword);
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const currentUserRole = req.user.role;

    if (currentUserRole === "Admin") {
      const users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 });
      return res.status(200).json(users);
    }

    const activeUsersData = await User.find({ status: "Active" }).select(
      "status",
    );
    return res.status(200).json(activeUsersData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role, status },
      { new: true },
    ).select("-password");

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res
        .status(400)
        .json({ message: "Password must be at least 4 characters." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await generateHashPassword(newPassword);
    await user.save();

    return res
      .status(200)
      .json({
        message: `Password for ${user.firstName} updated successfully!`,
      });
  } catch (error) {
    console.error("Admin Reset Error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

exports.validate = (method) => {
  switch (method) {
    case "signup": {
      return [
        check("firstName").notEmpty().withMessage("First name is required"),
        check("lastName").notEmpty().withMessage("Last name is required"),
        check("email").isEmail().withMessage("Valid email is required"),
        check("password").isLength({ min: 4 }).withMessage("Min 4 characters"),
      ];
    }
    case "login": {
      return [
        check("email").isEmail().withMessage("Valid email is required"),
        check("password").notEmpty().withMessage("Password is required"),
      ];
    }
    case "forgotPassword": {
      return [check("email").isEmail().withMessage("Valid email is required")];
    }
    case "resetPassword": {
      return [
        check("newPassword")
          .isLength({ min: 4 })
          .withMessage("Min 4 characters"),
      ];
    }
  }
};
