import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../components/ui/dialog/dialog";
import { FormActions } from "../../../../components/ui/form-field/form-field";
import styles from "./create-trip.module.css";
import type { TripRequestReview } from "./create-wizard";

export function TripRequestReviewDialog({
  open,
  titleId,
  formId,
  pending,
  review,
  onClose,
}: {
  open: boolean;
  titleId: string;
  formId: string;
  pending: boolean;
  review: TripRequestReview | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      titleId={titleId}
      title="مرور و تأیید درخواست سفر"
      description="اطلاعات واردشده را بررسی کنید و در صورت صحت، درخواست را ثبت کنید."
      size="wide"
    >
      {review && (
        <div className={styles.review}>
          <section>
            <h3>اطلاعات درخواست</h3>
            <dl className={styles.reviewList}>
              <div>
                <dt>نوع درخواست</dt>
                <dd>{review.requestTypeName || "—"}</dd>
              </div>
              <div>
                <dt>هدف سفر</dt>
                <dd>{review.purpose ?? "—"}</dd>
              </div>
              <div>
                <dt>زمان درخواست سفر</dt>
                <dd>{review.travelAt || "—"}</dd>
              </div>
              {review.commonOriginName && (
                <div>
                  <dt>مبدأ</dt>
                  <dd>{review.commonOriginName}</dd>
                </div>
              )}
              {review.commonDestinationName && (
                <div>
                  <dt>مقصد</dt>
                  <dd>{review.commonDestinationName}</dd>
                </div>
              )}
              {review.description && (
                <div className={styles.reviewDescription}>
                  <dt>توضیحات</dt>
                  <dd>{review.description}</dd>
                </div>
              )}
            </dl>
          </section>

          <section>
            <h3>مسافران</h3>
            <div className={styles.reviewTableWrap}>
              <table className={styles.reviewTable}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">نام مسافر</th>
                    <th scope="col">مسیر</th>
                    <th scope="col">تاریخ و ساعت سوارشدن</th>
                    <th scope="col">ترتیب سوارشدن</th>
                    <th scope="col">ترتیب پیاده‌شدن</th>
                    <th scope="col">توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {review.passengers.map((passenger, index) => (
                    <tr key={`${passenger.personName}-${index}`}>
                      <td data-label="مسافر">{index + 1}</td>
                      <td data-label="نام مسافر">{passenger.personName || "مسافر انتخاب‌نشده"}</td>
                      <td data-label="مسیر">{passenger.originName || "—"} ← {passenger.destinationName || "—"}</td>
                      <td data-label="تاریخ و ساعت سوارشدن">{passenger.pickup ?? (review.travelAt || "—")}</td>
                      <td data-label="ترتیب سوارشدن">{passenger.pickupOrder ?? "—"}</td>
                      <td data-label="ترتیب پیاده‌شدن">{passenger.dropoffOrder ?? "—"}</td>
                      <td data-label="توضیحات">{passenger.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <FormActions separated>
        <ActionButton
          type="submit"
          form={formId}
          disabled={pending || !open}
          pending={pending}
        >
          {pending ? "در حال ثبت…" : "تأیید و ثبت درخواست"}
        </ActionButton>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onClose}
        >
          بازگشت و ویرایش
        </ActionButton>
      </FormActions>
    </Dialog>
  );
}
