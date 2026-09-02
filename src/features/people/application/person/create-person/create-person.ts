import type { PersonRepository } from "../ports/person-repository";
import type {
  CreatePersonInput,
  CreatePersonResult,
} from "./create-person.contract";
import {
  normalizeCreatePersonInput,
  validateCreatePersonInput,
} from "./create-person-validation";

export class CreatePerson {
  constructor(private readonly personRepository: PersonRepository) {}

  async execute(input: CreatePersonInput): Promise<CreatePersonResult> {
    const normalizedInput = normalizeCreatePersonInput(input);
    const validationError = validateCreatePersonInput(normalizedInput);
    if (validationError !== null) {
      return { success: false, error: validationError };
    }

    if (
      normalizedInput.nationalCode !== null &&
      (await this.personRepository.existsByNationalCode(
        normalizedInput.nationalCode,
      ))
    ) {
      return {
        success: false,
        error: { type: "NATIONAL_CODE_ALREADY_EXISTS" },
      };
    }

    if (
      normalizedInput.personnelNo !== null &&
      (await this.personRepository.existsByPersonnelNo(
        normalizedInput.personnelNo,
      ))
    ) {
      return {
        success: false,
        error: { type: "PERSONNEL_NO_ALREADY_EXISTS" },
      };
    }

    if (
      normalizedInput.cardNo !== null &&
      (await this.personRepository.existsByCardNo(normalizedInput.cardNo))
    ) {
      return {
        success: false,
        error: { type: "CARD_NO_ALREADY_EXISTS" },
      };
    }

    const person = await this.personRepository.create(normalizedInput);

    return { success: true, person };
  }
}
