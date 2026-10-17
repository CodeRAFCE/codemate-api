const validator = require("validator");
const AppError = require("./AppError");

const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  const missing = [firstName, lastName, emailId, password].some(
    (v) => typeof v !== "string" || !v.trim(),
  );

  // Optional: Basic presence check (Mongoose schema also validates required fields)
  if (missing) {
    throw new AppError("All Fields are required", 400);
  } else if (!validator.isEmail(emailId)) {
    throw new AppError("Email id is invalid", 400);
  } else if (!validator.isStrongPassword(password)) {
    throw new AppError("Password is weak, Please enter strong password", 400);
  }
};

const validateProfileEditData = (req) => {
  const { about, skills, photoUrl } = req.body;

  const allowedEditFields = [
    "firstName",
    "lastName",
    "skills",
    "photoUrl",
    "gender",
    "age",
    "about",
  ];

  if (about && about.length > 300) {
    throw new AppError("about character limit exceeded", 400);
  } else if (skills && skills.length > 10) {
    throw new AppError("skills limit exceeded", 400);
  } else if (photoUrl && !validator.isURL(photoUrl)) {
    throw new AppError("Incorrect photoUrl format", 400);
  }

  const isProfileEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field),
  );

  return isProfileEditAllowed;
};

module.exports = { validateSignUpData, validateProfileEditData };
