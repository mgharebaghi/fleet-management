import { notFound } from "next/navigation";

import { makeGetPerson } from "../../composition/person.factory";
import { UpdatePersonForm } from "./form/update-person-form";

export async function UpdatePersonPage({ personId }: { personId: number }) {
  const person = await makeGetPerson().execute(personId);
  if (!person) {
    notFound();
  }

  return <UpdatePersonForm person={person} />;
}
