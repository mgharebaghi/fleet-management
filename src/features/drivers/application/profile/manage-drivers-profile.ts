import type { DriverRepository } from "../driver-repository";
import type { DriverResult } from "../driver-records";
import { validId } from "../assignment-rules";
import { failure } from "../drivers-write-rules";

export async function defineDriver(repository: DriverRepository, personId: number): Promise<DriverResult> {
  if (!validId(personId)) return failure("INVALID_ID");
  return repository.atomic(async session => {
    const person = await session.person(personId);
    if (!person) return failure("PERSON_NOT_FOUND");
    if (!person.isActive) return failure("PERSON_INACTIVE");
    if (await session.driverForPerson(personId)) return failure("DRIVER_EXISTS");
    return { success: true, id: await session.createDriver(personId) };
  });
}
