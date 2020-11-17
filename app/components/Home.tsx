import React from 'react';
import { Link } from 'react-router-dom';
import routes from '../constants/routes';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { Card, CardActions, Grid } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },

  card: {
    padding: theme.spacing(2),
    margin: theme.spacing(2),
  }
}));


export default function Home(): JSX.Element {
  const classes = useStyles();

  return (
    <Grid container>

      <Grid item xs={6}>
        <Card className={classes.card}>
          <h2>Instructions</h2>
          <CardActions>
            <Button component={Link} to={routes.Instructions}>Open</Button>
          </CardActions>
        </Card>
      </Grid>

      <Grid item xs={6}>
        <Card className={classes.card}>
          <h2>Tutorials</h2>
          <CardActions>
            <Button component={Link} to={routes.Tutorials}>Open</Button>
          </CardActions>
        </Card>
      </Grid>

      <Grid item xs={6}>
        <Card className={classes.card}>
          <h2>Exams</h2>
          <CardActions>
            <Button component={Link} to={routes.Exams}>Open</Button>
          </CardActions>
        </Card>
      </Grid>

      <Grid item xs={6}>
        <Card className={classes.card}>
          <h2>Task Sets</h2>
          <CardActions>
            <Button component={Link} to={routes.Tasksets}>Open</Button>
          </CardActions>
        </Card>
      </Grid>


      <Grid item xs={6}>
        <Card className={classes.card}>
          <h2>MTurk</h2>
          <CardActions>
            <Button component={Link} to={routes.Mturk}>Open</Button>
          </CardActions>
        </Card>
      </Grid>

    </Grid>
  );
}
