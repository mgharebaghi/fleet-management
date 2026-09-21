"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "@/components/ui/form-field/form-field";
import { IconActionButton } from "@/components/ui/icon-action-button/icon-action-button";
import { DeleteIcon } from "@/components/ui/icon/icons";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type { TripRoute } from "../../application/trip-records";
import { deleteTripRouteAction } from "../trip.actions";
import { tripMessages, type TripActionState } from "../trip-form-data";

export function DeleteRouteButton({
  tripRequestId,
  route,
  variant = "button",
}: {
  tripRequestId: number;
  route: TripRoute;
  variant?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const titleId = `${useId()}-delete-route-title`;
  const [state, action, pending] = useActionState(
    deleteTripRouteAction.bind(null, tripRequestId, route.routeId),
    {} satisfies TripActionState,
  );

  return (
    <>
      {variant === "icon" ? (
        <IconActionButton
          label="حذف مسیر"
          icon={<DeleteIcon />}
          tone="danger"
          onClick={() => setOpen(true)}
        />
      ) : (
        <ActionButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          حذف مسیر
        </ActionButton>
      )}
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title="حذف مسیر"
        recordName={route.routeName}
        identityLines={[
          { label: "نام مسیر", value: route.routeName },
          {
            label: "تعداد نقاط مسیر",
            value: `${route.points?.length ?? 0} نقطه`,
          },
        ]}
        message="آیا از حذف این مسیر اطمینان دارید؟ با حذف مسیر، تمام نقاط ثبت‌شده برای آن نیز حذف خواهند شد."
      >
        <form action={action} aria-busy={pending} noValidate>
          {state.error && (
            <InlineNotice tone="danger" role="alert">
              {tripMessages[state.error as keyof typeof tripMessages] ??
                "خطا در حذف مسیر"}
            </InlineNotice>
          )}
          <FormActions separated>
            <ActionButton
              type="submit"
              variant="danger"
              size="sm"
              disabled={pending}
              pending={pending}
            >
              {pending ? "در حال حذف…" : "حذف مسیر"}
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              انصراف
            </ActionButton>
          </FormActions>
        </form>
      </ConfirmDialog>
    </>
  );
}
