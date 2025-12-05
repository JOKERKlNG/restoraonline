const { users, createId } = require("./_sharedData");

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = (req, res) => {
  const { method } = req;

  if (method === "GET") {
    // Do not expose passwords
    const safeUsers = users.map(({ password, ...rest }) => rest);
    return sendJson(res, 200, safeUsers);
  }

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { email, password, name } = JSON.parse(body || "{}");
        if (!email || !password || !name) {
          return sendJson(res, 400, {
            error: "email, password and name are required",
          });
        }
        if (users.some((u) => u.email === email)) {
          return sendJson(res, 409, { error: "User already exists" });
        }
        const user = { id: createId(), email, password, name, role: "user" };
        users.push(user);
        const { password: _pw, ...safe } = user;
        return sendJson(res, 201, safe);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET,POST");
  res.end();
};


