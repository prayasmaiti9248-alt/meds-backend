const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- DATABASE CONNECTION ---------- */
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "Huijsen.24",
  database: "meds",
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("MySQL connected");
});

/* ---------- TEST ROUTE ---------- */
app.get("/", (req, res) => {
  res.send("API working");
});

/* ---------- GET ALL CITIES ---------- */
app.get("/cities", (req, res) => {
  db.query("SELECT id, city, state FROM region", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ---------- GET ALL DISEASES ---------- */
app.get("/diseases", (req, res) => {
  db.query(
    "SELECT disease_id, name, category FROM diseases",
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* ---------- OUTBREAKS BY CITY ---------- */
app.get("/outbreaks/:city", (req, res) => {
  const sql = `
    SELECT d.disease_id, d.name, o.risk_level, o.alert_note
    FROM outbreaks o
    JOIN diseases d ON o.disease_id = d.disease_id
    JOIN region r ON o.location_id = r.id
    WHERE r.city = ?
  `;

  db.query(sql, [req.params.city], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ---------- OUTBREAK SUMMARY (FOR CHARTS) ---------- */
app.get("/outbreak-summary/:city", (req, res) => {
  const sql = `
    SELECT o.risk_level, COUNT(*) AS count
    FROM outbreaks o
    JOIN region r ON o.location_id = r.id
    WHERE r.city = ?
    GROUP BY o.risk_level
  `;

  db.query(sql, [req.params.city], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ---------- SYMPTOMS ---------- */
app.get("/symptoms/:diseaseId", (req, res) => {
  db.query(
    "SELECT symptom_name FROM symptoms WHERE disease_id = ?",
    [req.params.diseaseId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* ---------- PREVENTION ---------- */
app.get("/prevention/:diseaseId", (req, res) => {
  db.query(
    "SELECT measure FROM prevention WHERE disease_id = ?",
    [req.params.diseaseId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* ---------- REMEDIES ---------- */
app.get("/remedies/:diseaseId", (req, res) => {
  db.query(
    "SELECT remedy, note FROM remedies WHERE disease_id = ?",
    [req.params.diseaseId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* ---------- FULL DISEASE DETAILS (IMPORTANT) ---------- */
app.get("/disease/:id", (req, res) => {
  const diseaseId = req.params.id;

  const sql = `
    SELECT 
      d.disease_id,
      d.name,
      d.category,
      d.description,
      s.symptom_name,
      p.measure,
      r.remedy,
      r.note
    FROM diseases d
    LEFT JOIN symptoms s ON d.disease_id = s.disease_id
    LEFT JOIN prevention p ON d.disease_id = p.disease_id
    LEFT JOIN remedies r ON d.disease_id = r.disease_id
    WHERE d.disease_id = ?
  `;

  db.query(sql, [diseaseId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ---------- HOSPITALS BY CITY ---------- */
app.get("/hospitals/:city", (req, res) => {
  const sql = `
    SELECT h.name, h.address, h.contact
    FROM hospitals h
    JOIN region r ON h.location_id = r.id
    WHERE r.city = ?
  `;

  db.query(sql, [req.params.city], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* ---------- SYMPTOM CHECKER ---------- */
app.post("/check-symptoms", (req, res) => {
  const { disease_id, location_id, selectedSymptoms } = req.body;

  db.query(
    "SELECT COUNT(*) AS total FROM symptoms WHERE disease_id = ?",
    [disease_id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      const total = result[0].total;
      const percent = (selectedSymptoms.length / total) * 100;

      let risk = "Low";
      if (percent > 60) risk = "High";
      else if (percent > 30) risk = "Medium";

      db.query(
        "INSERT INTO symptom_checks (disease_id, location_id, risk_result) VALUES (?, ?, ?)",
        [disease_id, location_id, risk]
      );

      res.json({ risk, percent: Math.round(percent) });
    }
  );
});

/* ---------- START SERVER ---------- */
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://localhost:3000");
});
