import React, { lazy, useRef } from "react";
import { QueryClient, QueryClientProvider } from "react-query";

import DataProvider from "./components/DataProvider";

import "./Covince.css";

const UI = lazy(() => import("./components/UI"));

const twentyFourHoursInMs = 1000 * 60 * 60 * 24;

const CovInce = ({
  data_url = "./data",
  tiles_url = "./tiles/Local_Authority_Districts__December_2019__Boundaries_UK_BUC.json",
  disableQueryParamURLs = false,
  ...props
}) => {
  const queryClient = useRef(
    new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnmount: false,
          refetchOnReconnect: false,
          staleTime: twentyFourHoursInMs * 100,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient.current}>
      <DataProvider
        default_data_url={data_url}
        default_tiles_url={tiles_url}
        disableQueryParams={disableQueryParamURLs}
      >
        <UI {...props} />
      </DataProvider>
    </QueryClientProvider>
  );
};

export default CovInce;
