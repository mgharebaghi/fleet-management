import type { DriverRepository } from "../driver-repository";
import type { DriverResult, NewLicense, UpdatedLicense } from "../driver-records";
import { validId } from "../assignment-rules";
import { failure, normalizedLicense, licenseError } from "../drivers-write-rules";

export async function addLicense(repository: DriverRepository, now: () => Date, input: NewLicense): Promise<DriverResult> {
  const value = normalizedLicense(input);
  const error = licenseError(value, now());
  if (error) return failure(error);
  return repository.atomic(async session => {
    if (!await session.driver(value.driverId)) return failure("DRIVER_NOT_FOUND");
    if (await session.licenseNumberExists(value.licenseNo)) return failure("LICENSE_EXISTS");
    return { success: true, id: await session.createLicense(value) };
  });
}

export async function updateLicense(repository: DriverRepository, now: () => Date, input: UpdatedLicense): Promise<DriverResult> {
  if (!validId(input.licenseId)) return failure("INVALID_ID");
  const value: UpdatedLicense = { ...input, ...normalizedLicense(input) };
  const error = licenseError(value, now());
  if (error) return failure(error);
  return repository.atomic(async session => {
    const existing = await session.license(value.licenseId);
    if (!existing || existing.driverId !== value.driverId) return failure("LICENSE_NOT_FOUND");
    if (await session.licenseNumberExists(value.licenseNo, value.licenseId)) return failure("LICENSE_EXISTS");
    await session.updateLicense(value);
    return { success: true, id: value.licenseId };
  });
}

export async function deleteLicense(repository: DriverRepository, driverId: number, licenseId: number): Promise<DriverResult> {
  if (!validId(driverId) || !validId(licenseId)) return failure("INVALID_ID");
  return repository.atomic(async session => {
    const existing = await session.license(licenseId);
    if (!existing || existing.driverId !== driverId) return failure("LICENSE_NOT_FOUND");
    await session.deleteLicense(licenseId);
    return { success: true, id: licenseId };
  });
}
