export type SchoolStatus = 'ACTIVE' | 'SUSPENDED';

export type School = {
  id: string;
  name: string;
  slug: string;
  status: SchoolStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateSchoolInput = {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminPhoneNumber?: string;
};

export type CreateSchoolResponse = {
  school: School;
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  invitationEmailSent: boolean;
};
