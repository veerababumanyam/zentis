import { ConnectorConfig, DataConnect, QueryRef, QueryPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface ClinicalTask_Key {
  id: UUIDString;
  __typename?: 'ClinicalTask_Key';
}

export interface Diagnosis_Key {
  id: UUIDString;
  __typename?: 'Diagnosis_Key';
}

export interface GetReportData {
  report?: {
    id: UUIDString;
    title: string;
    content: string;
    patient: {
      name: string;
    };
      createdBy?: {
        displayName?: string | null;
      };
  } & Report_Key;
}

export interface GetReportVariables {
  id: UUIDString;
}

export interface LabResult_Key {
  id: UUIDString;
  __typename?: 'LabResult_Key';
}

export interface ListPatientsData {
  patients: ({
    id: UUIDString;
    name: string;
    age: number;
    gender: string;
    assignedDoctor?: {
      displayName?: string | null;
    };
  } & Patient_Key)[];
}

export interface ListUsersData {
  users: ({
    uid: string;
    email: string;
    displayName?: string | null;
    role: string;
  })[];
}

export interface Medication_Key {
  id: UUIDString;
  __typename?: 'Medication_Key';
}

export interface Patient_Key {
  id: UUIDString;
  __typename?: 'Patient_Key';
}

export interface Report_Key {
  id: UUIDString;
  __typename?: 'Report_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface VitalSign_Key {
  id: UUIDString;
  __typename?: 'VitalSign_Key';
}

interface ListUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
  operationName: string;
}
export const listUsersRef: ListUsersRef;

export function listUsers(): QueryPromise<ListUsersData, undefined>;
export function listUsers(dc: DataConnect): QueryPromise<ListUsersData, undefined>;

interface ListPatientsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPatientsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPatientsData, undefined>;
  operationName: string;
}
export const listPatientsRef: ListPatientsRef;

export function listPatients(): QueryPromise<ListPatientsData, undefined>;
export function listPatients(dc: DataConnect): QueryPromise<ListPatientsData, undefined>;

interface GetReportRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetReportVariables): QueryRef<GetReportData, GetReportVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetReportVariables): QueryRef<GetReportData, GetReportVariables>;
  operationName: string;
}
export const getReportRef: GetReportRef;

export function getReport(vars: GetReportVariables): QueryPromise<GetReportData, GetReportVariables>;
export function getReport(dc: DataConnect, vars: GetReportVariables): QueryPromise<GetReportData, GetReportVariables>;

