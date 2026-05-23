import type {
  SmartLiveAlertLog,
  SmartLiveCommentLog,
  SmartLiveMode,
  SmartLivePlatform,
  SmartLiveReportLog,
  SmartLiveSessionLog,
  SmartLiveStreamStateLog,
} from "@vl-smartlive/log-schema";

export type CreateReportInput = {
  session: SmartLiveSessionLog;
  comments: SmartLiveCommentLog[];
  alerts: SmartLiveAlertLog[];
  streamStates?: SmartLiveStreamStateLog[];
  notes?: string[];
};

export type ReportCounts = SmartLiveReportLog["counts"];

export type ReportSummary = {
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  platform: SmartLivePlatform;
  mode: SmartLiveMode;
};

export type ReportEngineResult = {
  report: SmartLiveReportLog;
  markdown: string;
};
