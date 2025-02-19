import { UserPayload } from "../src/model/userModel";

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload; // Declaring user as an optional field
    }
  }
}
