function resultSuccess(data) {
  return { success: true, data };
}

function resultError(issues) {
  return { success: false, error: { issues } };
}

function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const signupSchema = {
  safeParse(input = {}) {
    const issues = [];
    const data = {};

    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) issues.push({ path: ["name"], message: "Name cannot be empty." });
      if (name.length > 100) issues.push({ path: ["name"], message: "Name must be 100 characters or less." });
      data.name = name;
    }

    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) issues.push({ path: ["email"], message: "Email must be valid." });
    data.email = email;

    const password = String(input.password ?? "");
    if (password.length < 8) issues.push({ path: ["password"], message: "Password must be at least 8 characters." });
    data.password = password;

    return issues.length ? resultError(issues) : resultSuccess(data);
  },
};

export const loginSchema = {
  safeParse(input = {}) {
    const issues = [];
    const email = normalizeEmail(input.email);
    const password = String(input.password ?? "");

    if (!isValidEmail(email)) issues.push({ path: ["email"], message: "Email must be valid." });
    if (!password) issues.push({ path: ["password"], message: "Password is required." });

    return issues.length ? resultError(issues) : resultSuccess({ email, password });
  },
};
