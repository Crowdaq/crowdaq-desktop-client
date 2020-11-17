import React, { useEffect } from 'react';
import Pagination from '@material-ui/lab/Pagination';
import { makeRequest } from '../../utils';
import { CrowdaqUIContext, getAuthHeader } from '../../crowdaq/context';
import LinearProgress, { LinearProgressProps } from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

interface PageOption {
  page_size: number,
  page: number
}

interface CrowdaqListingProps {
  fn: string,
  filter: any,
  itemDisplayComponent: React.FunctionComponent<any>
}

export const CrowdaqListing: React.FunctionComponent<CrowdaqListingProps> = (props) => {
  const appState = React.useContext(CrowdaqUIContext);
  const authHeader = getAuthHeader(appState);

  const [items, setItems] = React.useState<object[]>([]);
  const [totalPage, setTotalPage] = React.useState(1);
  const [pageInfo, setPageInfo] = React.useState<PageOption>({
    page: 1,
    page_size: 20
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');


  const fetchPage = (value: number) => {
    setLoading(true);
    makeRequest(appState.endpoint, props.fn, { ...props.filter, page_option: { ...pageInfo, page: value } }, authHeader)
      .then((resp: any) => {
        const totalPage = Math.ceil(resp.data.estimated_item_count / pageInfo.page_size);
        setTotalPage(totalPage);
        setPageInfo({
          page: value,
          page_size: pageInfo.page_size
        });
        setItems(resp.data.payload);
        setLoading(false);
        setError('');
      })
      .catch(error => {
        setLoading(false);
        if (error.response) {
          setError(`Failed to load: ${error.response.status}`);
        } else {
          setError(`Failed to load.`);
        }
      });
  };

  const handlePageChange = (event: any, value: number) => {
    fetchPage(value);
  };

  let mainContent;

  useEffect(() => {
    fetchPage(1);
  }, []);

  if (error === '') {
    mainContent = <React.Fragment>
      <props.itemDisplayComponent items={items} />
    </React.Fragment>;
  } else {
    mainContent = <div>{error}</div>;
  }

  return <React.Fragment>
    {mainContent}
    <Pagination count={totalPage} page={pageInfo.page} onChange={handlePageChange} />
  </React.Fragment>;
};

export function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
  return (
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box minWidth={35}>
        <Typography variant="body2" color="textSecondary">{`${Math.round(
          props.value
        )}%`}</Typography>
      </Box>
    </Box>
  );
}
