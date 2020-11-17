// import { createSlice, CaseReducer, PayloadAction } from '@reduxjs/toolkit';
// import { AppThunk, RootState } from '../../store';
//
//
// export interface AuthState {
//   login: boolean,
//   username: string,
//   token: string,
//   endpoint: string,
//   crowdaqBaseUrl: string
// }
//
// export interface TryLoginProps {
//   username: string,
//   password: string,
// }
//
// const setLogin_: CaseReducer<AuthState, PayloadAction<boolean>>
//   = (state, action) => {
//   state.login = action.payload;
// };
//
// const setToken_: CaseReducer<AuthState, PayloadAction<string>>
//   = (state, action) => {
//   state.token = action.payload;
// };
//
// const setUsername_: CaseReducer<AuthState, PayloadAction<string>>
//   = (state, action) => {
//   state.username = action.payload;
// };
//
// const setEndpoint_: CaseReducer<AuthState, PayloadAction<string>>
//   = (state, action) => {
//   state.endpoint = action.payload;
// };
//
// const setBaseUrl_: CaseReducer<AuthState, PayloadAction<string>>
//   = (state, action) => {
//   state.crowdaqBaseUrl = action.payload;
// };
//
// const authSlice = createSlice({
//   name: 'auth',
//   initialState: {
//     login: false,
//     username: '',
//     token: '',
//     endpoint: 'https://api.crowdaq.com/apiV2',
//     crowdaqBaseUrl: 'https://dev2.crowdaq.com'
//   } as AuthState,
//   reducers: {
//     setLogin: setLogin_,
//     setToken: setToken_,
//     setUsername: setUsername_,
//     setEndpoint: setEndpoint_,
//     setBaseUrl: setBaseUrl_
//   }
// });
//
// export const { setLogin, setToken, setUsername, setEndpoint, setBaseUrl } = authSlice.actions;
//
// export default authSlice.reducer;
//
//
// export const getLoginState = (state: RootState) => {
//   return state.auth.login;
// };
//
// export const selectCurrentUsername = (state: RootState) => state.auth.username;
// export const selectAuthToken = (state: RootState) => state.auth.token;
// export const selectEndpoint = (state: RootState) => state.auth.endpoint;
// export const selectSiteUrl = (state: RootState) => state.auth.crowdaqBaseUrl;
//
// // export const selectAuthHeader = (state: RootState) => ({
// //   authorization: `Bearer ${state.auth.token}`
// // });
