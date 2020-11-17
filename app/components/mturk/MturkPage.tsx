import React from 'react';
import { AWSCredProfile, createMTurkClient, loadAWSProfiles } from '../../utils';
import { Box, Button, CircularProgress, FormControlLabel, Grid, Typography, withStyles } from '@material-ui/core';
import AWS, { MTurk } from 'aws-sdk';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import { CurrencyAmount, GetAccountBalanceResponse } from 'aws-sdk/clients/mturk';
import { purple } from '@material-ui/core/colors';

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  },
  switch: {
    '&$checked': {
      color: theme.palette.success
    }
  }
}));

const GreenSwitch = withStyles(theme => ({
  switchBase: {
    // color: purple[300],
    '&$checked': {
      color: theme.palette.success.main
    },
    '&$checked + $track': {
      backgroundColor: theme.palette.success.main
    }
  },
  checked: {},
  track: {}
}))(Switch);


export const MturkAccountPage: React.FunctionComponent<{}> = (props) => {
  const [awsProfile, setAwsProfile] = React.useState<AWSCredProfile>({
    name: '',
    region: undefined,
    aws_access_key_id: '',
    aws_secret_access_key: ''
  });
  const [sandbox, setSandbox] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [remainBalance, setRemainBalance] = React.useState<GetAccountBalanceResponse>({
    AvailableBalance: undefined,
    OnHoldBalance: undefined
  });

  function updateAccount(profile: AWSCredProfile, sandbox: boolean) {
    setAwsProfile(profile);
    setSandbox(sandbox);
  }


  function summarizeMturk() {
    const mturkClient = createMTurkClient(awsProfile, sandbox);
    setLoading(true);
    mturkClient.getAccountBalance({}).promise().then(resp => {
      setRemainBalance(resp);
      setLoading(false);
    }).catch(error => {
      setError('Something is wrong');
      setLoading(false);
    });
  }

  return <div>
    <MturkAccountSelector onUpdate={updateAccount} />
    <Button onClick={summarizeMturk} disabled={awsProfile.name === ''}>Check Account</Button>
    <div>

      {loading && <CircularProgress />}
      {error !== '' && <p>{error}</p>}
      {
        (error === '' && !loading) && <React.Fragment>
          {remainBalance.AvailableBalance !== undefined && <p>
            AvailableBalance: {remainBalance.AvailableBalance}
          </p>}

          {remainBalance.OnHoldBalance !== undefined && <p>
            OnHoldBalance: {remainBalance.OnHoldBalance}
          </p>}
        </React.Fragment>
      }


    </div>
  </div>;
};


export const MturkAccountSelector: React.FunctionComponent<{ onUpdate: (profile: AWSCredProfile, sandbox: boolean) => void }> = (props) => {
  const classes = useStyles();

  const { onUpdate } = props;

  const [awsProfiles, setAwsProfiles] = React.useState<AWSCredProfile[]>([]);
  const [awsProfile, setAwsProfile] = React.useState<AWSCredProfile>({
    name: '',
    region: undefined,
    aws_access_key_id: '',
    aws_secret_access_key: ''
  });
  const [sandbox, setSandbox] = React.useState<boolean>(true);


  function loadAwsProfiles() {
    const profiles = loadAWSProfiles();
    setAwsProfiles(profiles);
  }

  function handleProfileChange(event: any) {
    const p = awsProfiles.find(profile => profile.name === event.target.value);
    if (p) {
      setAwsProfile(p);
      onUpdate(p, sandbox);
    }

  }

  function handleSandboxChange(event: any) {
    setSandbox(event.target.checked);
    onUpdate(awsProfile, event.target.checked);
  }


  React.useEffect(() => {
    loadAwsProfiles();
  }, []);

  return <div>
    <Box className={classes.formControl}>
      <span>MTurk Profile: </span>

      <Select
        error={awsProfile.name === ''}
        label="MTurk Profile"
        value={awsProfile.name}
        onChange={handleProfileChange}
        displayEmpty
        className={classes.selectEmpty}
        inputProps={{ 'aria-label': 'Without label' }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {awsProfiles.map(profile => {
          return <MenuItem key={profile.name} value={profile.name}>{profile.name}</MenuItem>;
        })}
      </Select>
    </Box>

    <Box className={classes.formControl}>
      <span>Use Sandbox: </span>
      <GreenSwitch checked={sandbox} onChange={handleSandboxChange} className={classes.switch} />
    </Box>


  </div>;
};
