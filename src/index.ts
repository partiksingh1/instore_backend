import express, { Request, Response } from 'express';
import storeRouter  from './routes/stores.js';
import authRouter from './routes/auth.js';
import dotenv from "dotenv";
import cors from "cors";
import adminRouter from './routes/admin.js';
import https from 'https'; 
// import { authenticate } from './middleware/authenticate';
dotenv.config();

const app = express();
const port = 3000;
app.use(cors());


// Middleware to parse JSON
app.use(express.json({ limit: '900mb' }));
app.use(express.urlencoded({ limit: '900mb', extended: true }));


// Apply authentication middleware globally to all routes
// app.use(authenticate);


app.use("/api/v1/auth", authRouter);
app.use("/api/v1", storeRouter);
app.use("/api/v1", adminRouter);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
