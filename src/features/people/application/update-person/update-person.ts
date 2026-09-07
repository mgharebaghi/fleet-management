import { PersonNotFoundError } from "../ports/person-repository";
import type { PersonRepository } from "../ports/person-repository";
import type { UpdatePersonInput, UpdatePersonResult } from "./update-person.contract";
import {
  normalizeUpdatePersonInput,
  validateUpdatePersonInput,
} from "./update-person.validation";

export class UpdatePerson {
  constructor(private readonly personRepository: PersonRepository) {}

  async execute(input: UpdatePersonInput): Promise<UpdatePersonResult> {
    const normalizedInput = normalizeUpdatePersonInput(input);
    const validationError = validateUpdatePersonInput(normalizedInput);
    if (validationError !== null) {
      return { success: false, error: validationError };
    }

    if (
      normalizedInput.nationalCode !== null &&
      (await this.personRepository.existsByNationalCode(
        normalizedInput.nationalCode,
        normalizedInput.personId,
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
        normalizedInput.personId,
      ))
    ) {
      return {
        success: false,
        error: { type: "PERSONNEL_NO_ALREADY_EXISTS" },
      };
    }

    if (
      normalizedInput.cardNo !== null &&
      (await this.personRepository.existsByCardNo(
        normalizedInput.cardNo,
        normalizedInput.personId,
      ))
    ) {
      return {
        success: false,
        error: { type: "CARD_NO_ALREADY_EXISTS" },
      };
    }

    try {
      const person = await this.personRepository.update(
        normalizedInput.personId,
        {
          personnelNo: normalizedInput.personnelNo,
          firstName: normalizedInput.firstName,
          lastName: normalizedInput.lastName,
          nationalCode: normalizedInput.nationalCode,
          cardNo: normalizedInput.cardNo,
          mobile: normalizedInput.mobile,
          employmentDate: normalizedInput.employmentDate,
          isActive: normalizedInput.isActive,
        },
      );

      return { success: true, person };
    } catch (error) {
      if (error instanceof PersonNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
