import { ListUsersData, ListPatientsData, GetReportData, GetReportVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListUsers(options?: useDataConnectQueryOptions<ListUsersData>): UseDataConnectQueryResult<ListUsersData, undefined>;
export function useListUsers(dc: DataConnect, options?: useDataConnectQueryOptions<ListUsersData>): UseDataConnectQueryResult<ListUsersData, undefined>;

export function useListPatients(options?: useDataConnectQueryOptions<ListPatientsData>): UseDataConnectQueryResult<ListPatientsData, undefined>;
export function useListPatients(dc: DataConnect, options?: useDataConnectQueryOptions<ListPatientsData>): UseDataConnectQueryResult<ListPatientsData, undefined>;

export function useGetReport(vars: GetReportVariables, options?: useDataConnectQueryOptions<GetReportData>): UseDataConnectQueryResult<GetReportData, GetReportVariables>;
export function useGetReport(dc: DataConnect, vars: GetReportVariables, options?: useDataConnectQueryOptions<GetReportData>): UseDataConnectQueryResult<GetReportData, GetReportVariables>;
