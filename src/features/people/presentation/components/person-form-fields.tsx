"use client";
import type { Person } from "../../application/person";
import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import { FieldErrors, FieldLabel, FormField, formControlClassName } from "../../../../components/ui/form-field/form-field";

type PersonField = "personnelNo" | "firstName" | "lastName" | "nationalCode" | "cardNo" | "mobile" | "employmentDate";

export function PersonFormFields({ person, errors, isPending }: {
  person?: Person;
  errors: Record<PersonField, string[]>;
  isPending: boolean;
}) {
  const {
    personnelNo: personnelNoErrors,
    firstName: firstNameErrors,
    lastName: lastNameErrors,
    nationalCode: nationalCodeErrors,
    cardNo: cardNoErrors,
    mobile: mobileErrors,
    employmentDate: employmentDateErrors,
  } = errors;
  return (
    <>
      <FormField>
        <FieldLabel htmlFor="firstName" required>
          نام
        </FieldLabel>
        <input
          className={formControlClassName}
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          defaultValue={person?.firstName}
          disabled={isPending}
          aria-invalid={firstNameErrors.length > 0}
          aria-describedby={
            firstNameErrors.length > 0 ? "firstName-error" : undefined
          }
        />
        <FieldErrors id="firstName-error" messages={firstNameErrors} />
      </FormField>

      <FormField>
        <FieldLabel htmlFor="lastName" required>
          نام خانوادگی
        </FieldLabel>
        <input
          className={formControlClassName}
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          required
          defaultValue={person?.lastName}
          disabled={isPending}
          aria-invalid={lastNameErrors.length > 0}
          aria-describedby={
            lastNameErrors.length > 0 ? "lastName-error" : undefined
          }
        />
        <FieldErrors id="lastName-error" messages={lastNameErrors} />
      </FormField>

      <FormField>
        <FieldLabel htmlFor="personnelNo">شماره پرسنلی</FieldLabel>
        <input
          className={formControlClassName}
          id="personnelNo"
          name="personnelNo"
          type="text"
          dir="ltr"
          defaultValue={person ? person.personnelNo ?? "" : undefined}
          disabled={isPending}
          aria-invalid={personnelNoErrors.length > 0}
          aria-describedby={
            personnelNoErrors.length > 0 ? "personnelNo-error" : undefined
          }
        />
        <FieldErrors
          id="personnelNo-error"
          messages={personnelNoErrors}
        />
      </FormField>

      <FormField>
        <FieldLabel htmlFor="nationalCode">کد ملی</FieldLabel>
        <input
          className={formControlClassName}
          id="nationalCode"
          name="nationalCode"
          type="text"
          inputMode="numeric"
          dir="ltr"
          defaultValue={person ? person.nationalCode ?? "" : undefined}
          disabled={isPending}
          aria-invalid={nationalCodeErrors.length > 0}
          aria-describedby={
            nationalCodeErrors.length > 0 ? "nationalCode-error" : undefined
          }
        />
        <FieldErrors
          id="nationalCode-error"
          messages={nationalCodeErrors}
        />
      </FormField>

      <FormField>
        <FieldLabel htmlFor="cardNo">شماره کارت</FieldLabel>
        <input
          className={formControlClassName}
          id="cardNo"
          name="cardNo"
          type="text"
          dir="ltr"
          defaultValue={person ? person.cardNo ?? "" : undefined}
          disabled={isPending}
          aria-invalid={cardNoErrors.length > 0}
          aria-describedby={
            cardNoErrors.length > 0 ? "cardNo-error" : undefined
          }
        />
        <FieldErrors id="cardNo-error" messages={cardNoErrors} />
      </FormField>

      <FormField>
        <FieldLabel htmlFor="mobile">شماره موبایل</FieldLabel>
        <input
          className={formControlClassName}
          id="mobile"
          name="mobile"
          type="text"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          defaultValue={person ? person.mobile ?? "" : undefined}
          disabled={isPending}
          aria-invalid={mobileErrors.length > 0}
          aria-describedby={
            mobileErrors.length > 0 ? "mobile-error" : undefined
          }
        />
        <FieldErrors id="mobile-error" messages={mobileErrors} />
      </FormField>

      <FormField>
        <JalaliDatePicker
          name="employmentDate"
          label="تاریخ استخدام (شمسی)"
          defaultValue={person?.employmentDate ? person.employmentDate.toISOString().slice(0, 10) : undefined}
          invalid={employmentDateErrors.length > 0}
          describedBy={
            employmentDateErrors.length > 0
              ? "employmentDate-error"
              : undefined
          }
          disabled={isPending}
        />
        <FieldErrors
          id="employmentDate-error"
          messages={employmentDateErrors}
        />
      </FormField>

    </>
  );
}
