import type { SearchableSelectOption } from "../../../../components/ui/searchable-select/searchable-select-options";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import type { TripPersonReference } from "../../application/trip-records";

export function tripPersonSelectOptions(
  people: TripPersonReference[],
  excludedPersonIds: readonly number[] = [],
): SearchableSelectOption[] {
  return people.map((person) => {
    const fullName = `${person.firstName} ${person.lastName}`.trim();
    const nationalCode = person.nationalCode?.trim() ?? "";
    const mobile = person.mobile?.trim() ?? "";
    const alreadySelected = excludedPersonIds.includes(person.personId);

    return {
      value: String(person.personId),
      disabled: alreadySelected,
      label: `${fullName} ${nationalCode}`.trim(),
      searchText: `${fullName} ${nationalCode} ${mobile}`,
      content: (
        <span>
          {fullName}
          {nationalCode ? (
            <>
              {" — "}
              <TechnicalValue>{nationalCode}</TechnicalValue>
            </>
          ) : null}
          {alreadySelected && " — قبلاً انتخاب شده"}
        </span>
      ),
    };
  });
}
