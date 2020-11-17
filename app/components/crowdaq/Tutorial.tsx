import React from 'react';
import { useSelector } from 'react-redux';
import { CrowdaqListing } from './Utils';
import { ExamDisplays } from './Exam';
import { Button } from '@material-ui/core';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';
import { InstructionRow } from './Instruction';
import { CrowdaqUIContext } from '../../crowdaq/context';
import { getObjectFolder, syncInstruction, syncTutorial } from '../../utils';

export const CrowdaqTutorial: React.FunctionComponent<{}> = (props) => {
  const appState = React.useContext(CrowdaqUIContext);

  const owner = appState.username;

  return <div>
    <h1>Tutorials</h1>
    <CrowdaqListing fn={'tutorial.list'} filter={{ owner }} itemDisplayComponent={CrowdaqTutorialDisplays} />
  </div>;
};

const CrowdaqTutorialDisplays: React.FunctionComponent<{ items: any[] }> = (props) => {
  return <TableContainer component={Paper}>
    <Table aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell>Tutorial Name</TableCell>
          <TableCell align="left">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {props.items.map((item, idx) => {
          return <CrowdaqTutorialRow key={item._id} {...item} />;
        })}
      </TableBody>
    </Table>
  </TableContainer>;
};


const CrowdaqTutorialRow: React.FunctionComponent<any> = (props) => {
  const appState = React.useContext(CrowdaqUIContext);

  async function onDownload() {
    const dest = await getObjectFolder(appState, 'tutorial', props.owner, props.tutorial_id);
    await syncTutorial(appState, props.owner, props.tutorial_id, dest);
  }

  return <TableRow>
    <TableCell>{props.owner}/{props.tutorial_id}</TableCell>
    <TableCell align="left"> <Button
      // component={Link}
      // to={`/exams/${props.exam_id}`}
      onClick={onDownload}
      color="inherit"
    >Download</Button></TableCell>
  </TableRow>;
};
