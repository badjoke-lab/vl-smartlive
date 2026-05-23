export const OBS_READ_ONLY_REQUESTS = [
  "GetVersion",
  "GetCurrentProgramScene",
  "GetStreamStatus",
  "GetStats",
] as const;

export type ObsReadOnlyRequestType = (typeof OBS_READ_ONLY_REQUESTS)[number];

export type ObsRequestEnvelope<TRequestType extends string, TRequestData = Record<string, never>> = {
  op: 6;
  d: {
    requestType: TRequestType;
    requestId: string;
    requestData?: TRequestData;
  };
};

export type ObsRequestStatus = {
  result: boolean;
  code: number;
  comment?: string;
};

export type ObsResponseEnvelope<TResponseData = Record<string, unknown>> = {
  op: 7;
  d: {
    requestType: string;
    requestId: string;
    requestStatus: ObsRequestStatus;
    responseData?: TResponseData;
  };
};

export type ObsGetVersionResponseData = {
  obsVersion?: string;
  obsWebSocketVersion?: string;
};

export type ObsGetCurrentProgramSceneResponseData = {
  currentProgramSceneName?: string;
};

export type ObsGetStreamStatusResponseData = {
  outputActive?: boolean;
  outputReconnecting?: boolean;
  outputSkippedFrames?: number;
};

export type ObsGetStatsResponseData = {
  cpuUsage?: number;
  activeFps?: number;
};
