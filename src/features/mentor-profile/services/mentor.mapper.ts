// In a real application, this would map raw API responses to our TypeScript domain models.
import { type Mentor } from "../types";

export class MentorMapper {
  static toDomain(raw: unknown): Mentor {
    return raw as Mentor;
  }
}
