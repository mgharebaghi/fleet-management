import { notFound } from "next/navigation";

import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../components/ui/back-link/back-link";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { makeGetPerson } from "../../composition/person.factory";
import { DeletePersonButton } from "../delete-person/delete-person-button";
import styles from "./person-details-page.module.css";

const dayFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "UTC",
  dateStyle: "medium",
});

function formatDay(date: Date | null): string {
  return date ? dayFormatter.format(date) : "ثبت نشده";
}

export async function PersonDetailsPage({ personId }: { personId: number }) {
  const person = await makeGetPerson().execute(personId);
  if (!person) {
    notFound();
  }

  const fullName = `${person.firstName} ${person.lastName}`;

  return (
    <PageShell>
      <PageHeader
        eyebrow="پروندهٔ شخص"
        title={fullName}
        action={
          <BackLink label="بازگشت به اشخاص" href="/people" />
        }
        compactAction
        description={
          <span className={styles.identityMeta}>
            <StatusBadge
              tone={person.isActive ? "positive" : "negative"}
              label={person.isActive ? "فعال" : "غیرفعال"}
            />
            <span className={styles.identityCodes}>
              <span>
                شمارهٔ پرسنلی:{" "}
                <TechnicalValue>{person.personnelNo ?? "—"}</TechnicalValue>
              </span>
              <span>
                کد ملی:{" "}
                <TechnicalValue>{person.nationalCode ?? "—"}</TechnicalValue>
              </span>
            </span>
          </span>
        }
      />

      <dl className={styles.details}>
        <div>
          <dt>شماره کارت</dt>
          <dd>
            <TechnicalValue>{person.cardNo ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>شماره موبایل</dt>
          <dd>
            <TechnicalValue>{person.mobile ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>تاریخ استخدام</dt>
          <dd>{formatDay(person.employmentDate)}</dd>
        </div>
        <div>
          <dt>تاریخ ثبت</dt>
          <dd>{formatDay(person.createdAt)}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <ActionLink href={`/people/${person.personId}/edit`} variant="primary">
          ویرایش اطلاعات
        </ActionLink>
        <DeletePersonButton
          personId={person.personId}
          personFullName={fullName}
          personnelNo={person.personnelNo}
          nationalCode={person.nationalCode}
        />
      </div>
    </PageShell>
  );
}
