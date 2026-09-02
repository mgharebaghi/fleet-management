import type { NewPerson, Person } from "../person";

export interface PersonRepository {
  existsByNationalCode(nationalCode: string): Promise<boolean>;
  existsByPersonnelNo(personnelNo: string): Promise<boolean>;
  existsByCardNo(cardNo: string): Promise<boolean>;
  create(person: NewPerson): Promise<Person>;
}
