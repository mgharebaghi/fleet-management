import { notFound } from "next/navigation";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { FormActions, FormSection, FieldHint, FormField } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { makeManageParts } from "../../../composition/part.factory";
import { makeReadInventoryReferences } from "../../../composition/inventory-reference.factory";
import { PartForm } from "../form/part-form";

export async function PartRecordPage({ partId, edit = false }: { partId?: number; edit?: boolean }) {
  const part = partId === undefined ? undefined : await makeManageParts().get(partId);
  if (part === null) notFound();
  const reference = makeReadInventoryReferences();
  const [units, categories] = edit || !part ? await Promise.all([reference.units(), reference.categories()]) : [[], []];
  return <PageShell width={edit || !part ? "narrow" : "wide"}>
    <PageHeader eyebrow="قطعات و انبار" title={!part ? "ثبت قطعه" : edit ? "ویرایش قطعه" : part.name} description={part && <span>کد قطعه: <TechnicalValue>{part.code}</TechnicalValue></span>} action={<BackLink label="بازگشت به قطعات" href="/inventory/parts" />} compactAction />
    {edit || !part ? units.length ? <PartForm part={part} units={units} categories={categories} /> : <ResultState title="ابتدا واحد شمارش تعریف کنید" description="برای ثبت قطعه، یک واحد شمارش مانند عدد، لیتر یا کیلوگرم لازم است. در اطلاعات پایه، واحد مورد نیاز را ثبت کنید و سپس به این صفحه برگردید." action={<ActionLink href="/inventory/catalogs">تعریف واحد شمارش</ActionLink>} /> : <>
      <FormSection title="مشخصات قطعه" aside={<StatusBadge label={part.isActive ? "فعال" : "غیرفعال"} tone={part.isActive ? "positive" : "negative"} />}><FormGrid>
        {[["واحد شمارش", part.unitName], ["دسته‌بندی", part.categoryName], ["شمارهٔ فنی", part.partNumber], ["سازنده", part.manufacturer], ["حداقل موجودی", part.minStock], ["حداکثر موجودی", part.maxStock], ["نقطهٔ سفارش", part.reorderPoint]].map(([label, value]) => <FormField key={label}><FieldHint>{label}</FieldHint><p>{value ?? "ثبت نشده"}</p></FormField>)}
      </FormGrid></FormSection>
      <FormSection title="سازگاری با مدل خودرو" description="سازگاری‌های ثبت‌شده برای این قطعه؛ این فهرست فقط قابل مشاهده است.">
        {part.compatibleModels.length ? <ul>{part.compatibleModels.map(model => <li key={model.id}>{model.name}{model.description ? ` — ${model.description}` : ""}</li>)}</ul> : <p>سازگاری با مدل خودرو ثبت نشده است.</p>}
      </FormSection>
      <FormActions separated><ActionLink href={`/inventory/parts/${part.id}/edit`} variant="primary">ویرایش قطعه</ActionLink><ActionLink href={`/inventory/stock?partId=${part.id}`}>موجودی در انبارها</ActionLink><ActionLink href={`/inventory/movements?partId=${part.id}`}>گردش انبار</ActionLink></FormActions>
    </>}
  </PageShell>;
}
