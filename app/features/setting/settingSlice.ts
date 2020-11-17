import { createSlice, CaseReducer, PayloadAction } from '@reduxjs/toolkit';
import { AppThunk, RootState } from '../../store';


export interface SettingState {
  mturkProfileName: string,
}


const _setMturkProfile: CaseReducer<SettingState, PayloadAction<{ profile: string }>>
  = (state, action) => {
  state.mturkProfileName = action.payload.profile;
};


const settingSlice = createSlice({
  name: 'setting',
  initialState: {
    mturkProfileName: ''
  } as SettingState,
  reducers: {
    setMturkProfile: _setMturkProfile
  }
});

export const { setMturkProfile } = settingSlice.actions;

export default settingSlice.reducer;
export const selectmturkProfileName = (state: RootState) => state.auth.endpoint;
