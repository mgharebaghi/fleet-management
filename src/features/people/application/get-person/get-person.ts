import type { Person } from "../person";
import type { PersonRepository } from "../ports/person-repository";

export class GetPerson {
  constructor(private readonly personRepository: PersonRepository) {}

  async execute(personId: number): Promise<Person | null> {
    return this.personRepository.findById(personId);
  }
}
