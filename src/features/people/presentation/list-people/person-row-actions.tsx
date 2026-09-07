"use client";

import { useState } from "react";

import {
  DeleteIcon,
  EditIcon,
  ViewIcon,
} from "../../../../components/ui/icon/icons";
import {
  IconActionButton,
  IconActionGroup,
  IconActionLink,
} from "../../../../components/ui/icon-action-button/icon-action-button";
import type { PersonSummary } from "../../application/list-people/person-summary";
import { DeletePersonDialog } from "../delete-person/delete-person-dialog";

/** The per-row actions on the people list: open, edit and delete a person. */
export function PersonRowActions({ person }: { person: PersonSummary }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fullName = `${person.firstName} ${person.lastName}`;

  return (
    <>
      <IconActionGroup>
        <IconActionLink
          label={`مشاهده پروندهٔ ${fullName}`}
          icon={<ViewIcon />}
          href={`/people/${person.personId}`}
        />
        <IconActionLink
          label={`ویرایش ${fullName}`}
          icon={<EditIcon />}
          href={`/people/${person.personId}/edit`}
        />
        <IconActionButton
          label={`حذف ${fullName}`}
          icon={<DeleteIcon />}
          tone="danger"
          onClick={() => setDeleteOpen(true)}
        />
      </IconActionGroup>

      <DeletePersonDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        personId={person.personId}
        personFullName={fullName}
        personnelNo={person.personnelNo}
        nationalCode={person.nationalCode}
      />
    </>
  );
}
