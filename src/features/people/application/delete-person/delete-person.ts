import {
  PersonNotFoundError,
  PersonReferencedError,
  type PersonRepository,
} from "../ports/person-repository";
import type { DeletePersonResult } from "./delete-person.contract";

export class DeletePerson {
  constructor(private readonly personRepository: PersonRepository) {}

  async execute(personId: number): Promise<DeletePersonResult> {
    try {
      await this.personRepository.remove(personId);
      return { success: true };
    } catch (error) {
      if (error instanceof PersonReferencedError) {
        return { success: false, error: { type: "REFERENCED" } };
      }
      if (error instanceof PersonNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
