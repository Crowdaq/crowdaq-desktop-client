import React from 'react';
import { loadAWSProfiles } from '../../utils';
import {
  Button,
  TextareaAutosize,
  TextField,
  InputAdornment,
  Input,
  InputLabel,
  FormControl,
  Select, MenuItem, Grid, Divider
} from '@material-ui/core';
import AWS from 'aws-sdk';
import { CreateHITRequest, HITAccessActions, QualificationRequirement, Comparator } from 'aws-sdk/clients/mturk';
import { makeStyles } from '@material-ui/core/styles';
import _ from 'lodash';

function stringIsInteger(value: string): boolean {
  return /^-?\d+$/.test(value);
}


const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap'
    // padding: theme.spacing(3)
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: '25ch'
  }
}));


export interface CreateHitProps {
  request: CreateHITRequest,
  onUpdate: (newRequest: CreateHITRequest) => void,
  candidates: { [key: string]: QualificationRequirement },
}

export const MturkCreateHitConfigurator: React.FunctionComponent<CreateHitProps> = (props) => {
  const classes = useStyles();
  const { request, onUpdate } = props;

  return <div className={classes.root}>
    <TextField
      label="Title"
      style={{ margin: 8 }}
      value={props.request.Title}
      fullWidth
      margin="normal"
      InputLabelProps={{
        shrink: true
      }}
      onChange={(event) =>
        onUpdate({ ...request, Title: event.target.value })}
    />

    <TextField
      label="Description"
      style={{ margin: 8 }}
      value={props.request.Description}
      fullWidth
      margin="normal"
      InputLabelProps={{
        shrink: true
      }}
      onChange={(event) =>
        onUpdate({ ...request, Description: event.target.value })}
    />

    <TextField
      label="Keywords"
      style={{ margin: 8 }}
      // placeholder="Placeholder"
      helperText="Separated by comma"
      fullWidth
      margin="normal"
      value={props.request.Keywords}
      InputLabelProps={{
        shrink: true
      }}
      onChange={(event) =>
        onUpdate({ ...request, Keywords: event.target.value })}
    />


    <FormControl style={{ margin: 8 }}>
      <InputLabel>Reward</InputLabel>
      <Input
        value={props.request.Reward}
        onChange={(event) =>
          onUpdate({ ...request, Reward: event.target.value })}

        startAdornment={<InputAdornment position="start">$</InputAdornment>}
      />
    </FormControl>

    <TextField
      fullWidth
      label="Lifetime Time in Seconds"
      style={{ margin: 8 }}
      margin="normal"
      value={props.request.LifetimeInSeconds}
      InputLabelProps={{
        shrink: true
      }}
      onChange={(event) =>
        onUpdate({ ...request, LifetimeInSeconds: parseInt(event.target.value) })}

    />

    <TextField
      fullWidth
      label="Assignment Duration in Seconds"
      style={{ margin: 8 }}
      margin="normal"
      value={props.request.AssignmentDurationInSeconds}
      InputLabelProps={{
        shrink: true
      }}
      onChange={(event) =>
        onUpdate({ ...request, AssignmentDurationInSeconds: parseInt(event.target.value) })}
    />

    <h3>Add extra qualifications</h3>

    <MTurkQualificationRequirementList
      requirements={request.QualificationRequirements || []}
      candidates={props.candidates}
      onChange={(QualificationRequirements => {
        onUpdate({ ...request, QualificationRequirements });
      })}
    />

  </div>;
};


export const MturkQualification: React.FunctionComponent<{}> = (props) => {
  // const [awsProfiles, setAwsProfiles] = React.useState<string[]>([]);
  // React.useEffect(() => {
  //   const profiles = loadAWSProfiles();
  //   setAwsProfiles(profiles);
  // }, []);


  return <div>
    <Button>Create new Qualification</Button>
    <Button>Give Qualification</Button>
  </div>;
};

export interface MTurkQualificationRequirementProps {
  value: QualificationRequirement,
  onUpdate: (newRequest: CreateHITRequest) => void
}


const useQualStyles = makeStyles((theme) => ({

  newBox: {
    border: '1px solid black',
    padding: theme.spacing(1)
  },

  existingQual: {
    border: '1px dashed grey',
    padding: theme.spacing(1),
    marginTop: theme.spacing(2)
  }

}));


export const MTurkQualificationRequirementList: React.FunctionComponent<{
  requirements: QualificationRequirement[],
  candidates: { [key: string]: QualificationRequirement },
  onChange?: (requirements: QualificationRequirement[]) => void
}> = (props) => {
  const classes = useQualStyles();
  const { requirements, onChange } = props;
  const [toAdd, setToAdd] = React.useState<QualificationRequirement>({
    ActionsGuarded: 'Accept',
    Comparator: '',
    IntegerValues: [],
    LocaleValues: [],
    QualificationTypeId: ''
  });

  const [iv, setIvs] = React.useState<string>('');
  const [ivError, setIvError] = React.useState<string>('');

  const [lv, setLvs] = React.useState<string>('');
  const [lvError, setLvError] = React.useState<string>('');

  const [selectedExample, setExample] = React.useState<string>('');

  return <div>


    <Grid container className={classes.newBox} spacing={1}>

      <Grid item xs={12}>
        <FormControl variant="filled" disabled={Object.keys(props.candidates).length === 0}>
          <InputLabel id="qual-template-select-label">Load Common Qualification</InputLabel>
          <Select
            fullWidth
            labelId="qual-template-select-label"
            id="qual-template-select"
            value={selectedExample}
            style={{ minWidth: '15em' }}
            onChange={e => {
              const k: string = e.target.value as string;
              setExample(k);
              const v = props.candidates[k];
              if (v) {
                setToAdd(v);
                const iv = v.IntegerValues?.map(x => `${x}`).join(',')
                if (iv) {
                  setIvs(iv)
                }else{
                  setIvs('')
                }

                if (v.LocaleValues){
                  setLvs(JSON.stringify(v.LocaleValues));
                }else{
                  setLvs('');
                }


              }
            }}
          >
            {Object.keys(props.candidates).map(v => {
              return <MenuItem key={v} value={v}>{v}</MenuItem>;
            })}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Divider/>
      </Grid>




      <Grid item xs={12}>
        <FormControl>
          <InputLabel id="action-guard-select-label">Action Guard</InputLabel>
          <Select
            fullWidth
            labelId="action-guard-select-label"
            id="action-guard-select"
            value={toAdd.ActionsGuarded}
            style={{ minWidth: '15em' }}
            onChange={e => {
              const ActionsGuarded = e.target.value as HITAccessActions;
              setToAdd({ ...toAdd, ActionsGuarded });
            }}
          >
            {[
              'Accept', 'PreviewAndAccept', 'DiscoverPreviewAndAccept'
            ].map(v => {
              return <MenuItem key={v} value={v}>{v}</MenuItem>;
            })}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="QualificationTypeId"
          margin="normal"
          fullWidth
          value={toAdd.QualificationTypeId}
          InputLabelProps={{
            shrink: true
          }}
          onChange={(event) => {
            const QualificationTypeId = event.target.value;
            setToAdd({ ...toAdd, QualificationTypeId });
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl>
          <InputLabel id="comparator-select-label">Comparator</InputLabel>
          <Select
            labelId="comparator-select-label"
            id="comparator-select"
            value={toAdd.Comparator}
            style={{ minWidth: '15em' }}
            onChange={e => {
              const Comparator = e.target.value as Comparator;
              setToAdd({ ...toAdd, Comparator });
            }}
          >
            {[
              'LessThan', 'LessThanOrEqualTo', 'GreaterThan', 'GreaterThanOrEqualTo', 'EqualTo', 'NotEqualTo', 'Exists', 'DoesNotExist', 'In', 'NotIn'
            ].map(v => {
              return <MenuItem value={v} key={v}>{v}</MenuItem>;
            })}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>


        <TextField
          fullWidth
          label="IntegerValues"
          error={ivError !== ''}
          helperText={ivError}

          margin="normal"
          value={iv}
          InputLabelProps={{
            shrink: true
          }}
          onChange={(event) => {
            setIvs(event.target.value);
            try {
              let draftIntegerValues = event.target.value.split(',');
              console.log(draftIntegerValues);
              if (_.some(draftIntegerValues, v => !stringIsInteger(v.trim()))) {
                throw new Error('');
              }
              const IntegerValues = draftIntegerValues.map(x => parseInt(x));
              setToAdd({ ...toAdd, IntegerValues });
              setIvError('');
            } catch (e) {
              if (event.target.value !== '')
              setIvError('must be a list of integers separated by comma (e.g., 1, 2)');
            }

          }}
        />

        <TextField
          fullWidth
          label="LocaleValues"
          error={lvError !== ''}
          helperText={lvError}

          margin="normal"
          value={lv}
          InputLabelProps={{
            shrink: true
          }}
          onChange={(event) => {
            setLvs(event.target.value);
            try {
              const LocaleValues = JSON.parse(event.target.value);
              if (!Array.isArray(LocaleValues)){
                throw new Error('');
              }
              setToAdd({ ...toAdd, LocaleValues });
              setLvError('');
            } catch (e) {
              if (event.target.value !== '')
              setLvError('Must be json array of Locale values (e.g., [{"Country":"US"}]), see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MTurk.html#createHIT-property');
            }
          }}
        />
      </Grid>

      <Grid item xs={12}>
        <Button onClick={() => {
          if (props.onChange) {
            console.log(toAdd);
            if(toAdd.Comparator == 'Exists' || toAdd.Comparator == 'DoesNotExist'){
              toAdd.IntegerValues = undefined;
            }
            if(toAdd.Comparator !== 'EqualTo' && toAdd.Comparator !== 'NotEqualTo' && toAdd.Comparator !== 'In' && toAdd.Comparator !== 'NotIn'){
              toAdd.LocaleValues = undefined;
            }
            console.log(toAdd);
            props.onChange([...requirements, toAdd]);
          }
        }}
          variant="outlined"
        >Add new requirement</Button>
      </Grid>


    </Grid>

    {
      requirements !== undefined && requirements.map((qr, i) => {
        return <MTurkQualificationRequirement
          requirement={qr} key={i}
          onDelete={() => {
            if (props.onChange){
              const nrs = [...requirements];
              nrs.splice(i, 1);
              props.onChange(nrs)
            }
          }}
        />;
      })
    }

  </div>;
};

export const MTurkQualificationRequirement: React.FunctionComponent<{
  name?: string
  requirement: QualificationRequirement,
  onDelete?: () => void
}> = (props) => {
  const { requirement, onDelete } = props;
  const classes = useQualStyles();

  return <Grid container className={classes.existingQual}>
    <Grid item xs={12}>
      QualificationTypeId： {requirement.QualificationTypeId}
    </Grid>

    <Grid item xs={6}>
      ActionsGuarded： {requirement.ActionsGuarded}
    </Grid>

    <Grid item xs={6}>
      Comparator： {requirement.Comparator}
    </Grid>

    <Grid item xs={6}>
      IntegerValues: {JSON.stringify(requirement.IntegerValues)}
    </Grid>

    <Grid item xs={6}>
      LocaleValues: {JSON.stringify(requirement.LocaleValues)}
    </Grid>

    <Grid item xs={6}>
      <Button onClick={() => {
        if (props.onDelete) {
          props.onDelete();
        }
      }}
      variant="outlined"
      >Delete</Button>
    </Grid>

  </Grid>;
};
