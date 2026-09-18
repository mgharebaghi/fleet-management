import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../components/ui/dialog/dialog";
import { FormActions } from "../../../../components/ui/form-field/form-field";
import styles from "../trip-forms.module.css";
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
      title="مرور و تأیید درخواست"
      description="پس از تأیید، درخواست سفر ثبت می‌شود."
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
                <dt>زمان ثبت</dt>
                <dd>{review.requestAt || "—"}</dd>
              </div>
              <div>
                <dt>زمان برنامه‌ریزی‌شده</dt>
                <dd>{review.travelAt || "—"}</dd>
              </div>
              {review.commonOriginName && (
                <div>
                  <dt>مبدأ مشترک</dt>
                  <dd>{review.commonOriginName}</dd>
                </div>
              )}
              {review.commonDestinationName && (
                <div>
                  <dt>مقصد مشترک</dt>
                  <dd>{review.commonDestinationName}</dd>
                </div>
              )}
              {review.description && (
                <div>
                  <dt>توضیحات</dt>
                  <dd>{review.description}</dd>
                </div>
              )}
            </dl>
          </section>

          <section>
            <h3>مسافران</h3>
            <ol className={styles.reviewPassengers}>
              {review.passengers.map((passenger, index) => (
                <li key={`${passenger.personName}-${index}`}>
                  <strong>{passenger.personName || "مسافر انتخاب‌نشده"}</strong>
                  <p>
                    {passenger.originName || "—"} ←{" "}
                    {passenger.destinationName || "—"}
                  </p>
                  {passenger.pickup && <p>سوارشدن: {passenger.pickup}</p>}
                  {passenger.pickupOrder && (
                    <p>ترتیب سوارشدن: {passenger.pickupOrder}</p>
                  )}
                  {passenger.dropoffOrder && (
                    <p>ترتیب پیاده‌شدن: {passenger.dropoffOrder}</p>
                  )}
                  {passenger.description && <p>{passenger.description}</p>}
                </li>
              ))}
            </ol>
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
