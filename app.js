const express = require("express");
const path = require("path");
const app = express();

const jsonMiddleware = express.json();
app.use(jsonMiddleware);

app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Sever Running at http://localhost:3000/");
    });
  } catch (err) {
    console.log(`DB Error: ${err.massage}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const authenticateToken = (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secret_token", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// LOGIN API 1
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username !== "christopher_phillips") {
    res.status(400);
    res.send("Invalid user");
  } else {
    if (password === "christy@123") {
      const payload = { username: username };
      const jwtToken = jwt.sign(password, "secret_token");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

// GET States API 2
app.get("/states/", authenticateToken, async (req, res) => {
  const getStatesQuery = `
    SELECT
    state_id as stateId,
    state_name as stateName,
    population
    FROM
    state
    `;
  const statesArray = await db.all(getStatesQuery);
  res.send(statesArray);
});

// GET State by ID API 3
app.get("/states/:stateId/", authenticateToken, async (req, res) => {
  const { stateId } = req.params;
  const getStateQuery = `SELECT
    state_id as stateId,
    state_name as stateName,
    population
    FROM state WHERE state_id = ${stateId};`;
  const stateData = await db.get(getStateQuery);
  res.send(stateData);
});

// ADD District API 4
app.post("/districts/", authenticateToken, async (req, res) => {
  const districtDetails = req.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO
      district (district_name,state_id,cases,cured,active,deaths)
    VALUES
      ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await db.run(addDistrictQuery);
  res.send("District Successfully Added");
});

// GET District by ID API 5
app.get("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const getDistrictQuery = `SELECT 
  district_id as districtId,
  district_name as districtName,
  state_id as stateId,
  cases,
  cured,
  active,
  deaths
  FROM district WHERE district_id = ${districtId};`;
  const districtData = await db.get(getDistrictQuery);
  res.send(districtData);
});

// Delete District API 6
app.delete("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const deleteDistrictQuery = `
    DELETE FROM
        district
    WHERE
    district_Id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  res.send("District Removed");
});

// Update District API 7
app.put("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const districtsDetails = req.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtsDetails;
  const updateDistrictQuery = `
  UPDATE 
   district
  SET
   district_name='${districtName}',
   state_id=${stateId},
   cases=${cases},
   cured=${cured},
   active=${active},
   deaths=${deaths}
  WHERE
   district_Id = ${districtId}`;
  await db.run(updateDistrictQuery);
  res.send("District Details Updated");
});

// GET Stats of a State API 8
app.get("/states/:stateId/stats/", authenticateToken, async (req, res) => {
  const { stateId } = req.params;
  const getStatsQuery = `
    SELECT
    sum(T.cases) as totalCases,
    sum(T.cured) as totalCured,
    sum(T.active) as totalActive,
    sum(T.deaths) as totalDeaths
    FROM (state 
    inner Join district ON state.state_id = district.state_id) as T
    WHERE
    state.state_id = ${stateId}
    `;
  const stats = await db.get(getStatsQuery);
  res.send(stats);
});

// GET State by District ID API 8
app.get(
  "/districts/:districtId/details/",
  authenticateToken,
  async (req, res) => {
    const { districtId } = req.params;
    const getStatesQuery = `
    SELECT
    T.state_name as stateName
    FROM (district inner
    Join state ON state.state_id = district.state_id) as T
    WHERE
    district.district_id = ${districtId}
    `;
    const statesArray = await db.get(getStatesQuery);
    res.send(statesArray);
  }
);

module.exports = app;
