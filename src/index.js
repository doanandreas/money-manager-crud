const express = require("express");
const { Pool } = require("pg");
const logger = require("morgan");
const multer = require("multer");
const path = require("path");

const keys = require("./keys");

const app = express();
app.use(express.json());
app.use(logger("common"));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve("uploads/"));
  },
  filename: (_req, file, cb) => {
    const [filename] = file.originalname.split(".");
    const ext = path.extname(file.originalname);
    const newFileName = `${filename}${ext}`;
    cb(null, newFileName);
  },
});

const upload = multer({ storage: storage });

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on("connect", () => {
  pgClient
    .query(
      `
      CREATE TABLE IF NOT EXISTS expense (
        id serial primary key,
        number INT,
        description varchar (50),
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      )
      `
    )
    .catch((err) => console.log(err));
});

app.get("/expense/all", (req, res) => {
  pgClient.query("SELECT * FROM expense", (err, result) => {
    if (err) {
      res.status(400).json({ success: false, reason: err.message });
    } else {
      res.json({ success: true, result: result.rows });
    }
  });
});

app.get("/expense/total", (req, res) => {
  pgClient.query("SELECT SUM(number) FROM expense", (err, result) => {
    if (err) {
      res.status(400).json({ success: false, reason: err.message });
    } else {
      // If no expense then sum is null. If null then return 0 using JS magic
      res.json({
        success: true,
        result: { totalExpense: result.rows[0].sum || 0 },
      });
    }
  });
});

app.post("/expense", (req, res) => {
  const { number, description } = req.body;

  pgClient.query(
    "INSERT INTO expense(number, description, created_at, updated_at) VALUES($1, $2, $3, $4)",
    [number, description, "NOW()", "NOW()"],
    (err, result) => {
      if (err) {
        res.status(400).json({ success: false, reason: err.message });
      } else {
        res.json({ success: true, result: req.body });
      }
    }
  );
});

app.put("/expense/:id", (req, res) => {
  const { number, description } = req.body;
  const id = req.params.id;

  pgClient.query(
    "UPDATE expense SET number = $1, description = $2, updated_at = NOW() WHERE id = $3",
    [number, description, id],
    (err, result) => {
      if (err) {
        res.status(400).json({ success: false, reason: err.message });
      } else {
        res.json({ success: true, result: req.body });
      }
    }
  );
});

app.delete("/expense/:id", (req, res) => {
  const id = req.params.id;

  pgClient.query("DELETE FROM expense WHERE id = $1", [id], (err, result) => {
    if (err) {
      res.status(400).json({ success: false, reason: err.message });
    } else {
      res.json({ success: true, result: `User deleted with ID: ${id}` });
    }
  });
});

app.post("/img", upload.single("img"), (req, res) => {
  res.json({ success: true });
});

app.get("/duarrr", (req, res) => {
  pgClient.query("DROP TABLE expense");
  res.send("destroyed");
});

app.listen(8000, (err) => {
  console.log("Listening to port 8000");
});
