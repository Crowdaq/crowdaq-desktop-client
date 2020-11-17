import React from 'react';
import { useSelector } from 'react-redux';
import { CrowdaqListing } from './Utils';
import { ExamDataItem, ExamDisplays } from './Exam';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';
import { Button } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { CrowdaqUIContext } from '../../crowdaq/context';
import { getObjectFolder, openFolder, syncInstruction } from '../../utils';

export const CrowdaqInstructions: React.FunctionComponent<{}> = (props) => {
  const appState = React.useContext(CrowdaqUIContext);

  const owner = appState.username;

  return <div>
    <h1>Instructions</h1>
    <CrowdaqListing fn={'instruction.list'} filter={{ owner }} itemDisplayComponent={InstructionDisplays} />
  </div>;
};


export const InstructionDisplays: React.FunctionComponent<{ items: any[] }> = (props) => {
  return <TableContainer component={Paper}>
    <Table aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell>Instruction Name</TableCell>
          <TableCell align="left">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {props.items.map((item, idx) => {
          return <InstructionRow key={item._id} {...item} />;
        })}
      </TableBody>
    </Table>
  </TableContainer>;

};


export const InstructionRow: React.FunctionComponent<ExamDataItem> = (props) => {

  const appState = React.useContext(CrowdaqUIContext);

  async function onDownload() {
    const dest = await getObjectFolder(appState, 'instruction', props.owner, props.instruction_id);
    await syncInstruction(appState, props.owner, props.instruction_id, dest);
  }

  return <TableRow>
    <TableCell>{props.owner}/{props.instruction_id}</TableCell>
    <TableCell align="left"> <Button
      // component={Link}
      // to={`/exams/${props.exam_id}`}
      color="inherit"
      onClick={onDownload}
    >Download</Button></TableCell>
  </TableRow>;
};
