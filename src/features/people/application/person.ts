export type NewPerson = {
  personnelNo: string | null;
  firstName: string;
  lastName: string;
  nationalCode: string | null;
  cardNo: string | null;
  mobile: string | null;
  employmentDate: Date | null;
};

export type Person = NewPerson & {
  personId: number;
  isActive: boolean;
  createdAt: Date;
};
