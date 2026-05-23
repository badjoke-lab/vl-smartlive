import {
  ALERT_SEVERITIES,
  ALERT_SOURCES,
  ALERT_TYPES,
  COMMENT_LABELS,
  COMMENT_PRIORITIES,
  LOG_SCHEMA_VERSION,
  SMARTLIVE_APP_IDS,
  SMARTLIVE_PLATFORMS,
} from "./constants";
import type { LogValidationError, LogValidationResult } from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(input: unknown): input is UnknownRecord {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isString(input: unknown): input is string {
  return typeof input === "string" && input.length > 0;
}

function isNumber(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input);
}

function isBoolean(input: unknown): input is boolean {
  return typeof input === "boolean";
}

function isOneOf<T extends readonly string[]>(input: unknown, allowed: T): input is T[number] {
  return typeof input === "string" && (allowed as readonly string[]).includes(input);
}

function error(path: string, code: string, message: string): LogValidationError {
  return { path, code, message, severity: "error" };
}

function validateBase(input: unknown, errors: LogValidationError[]): input is UnknownRecord {
  if (!isRecord(input)) {
    errors.push(error("$", "not_object", "Log entry must be an object."));
    return false;
  }

  if (input.schemaVersion !== LOG_SCHEMA_VERSION) {
    errors.push(error("schemaVersion", "invalid_schema_version", `schemaVersion must be ${LOG_SCHEMA_VERSION}.`));
  }

  if (!isOneOf(input.appId, SMARTLIVE_APP_IDS)) {
    errors.push(error("appId", "invalid_app_id", "appId is not supported."));
  }

  if (!isString(input.appVersion)) {
    errors.push(error("appVersion", "missing_app_version", "appVersion is required."));
  }

  if (!isString(input.sessionId)) {
    errors.push(error("sessionId", "missing_session_id", "sessionId is required."));
  }

  return true;
}

function result(errors: LogValidationError[]): LogValidationResult {
  return { valid: errors.length === 0, errors };
}

export function validateSessionLog(input: unknown): LogValidationResult {
  const errors: LogValidationError[] = [];
  if (!validateBase(input, errors)) return result(errors);

  if (!isString(input.createdAt)) errors.push(error("createdAt", "missing_created_at", "createdAt is required."));
  if (!isString(input.updatedAt)) errors.push(error("updatedAt", "missing_updated_at", "updatedAt is required."));
  if (!isOneOf(input.platform, SMARTLIVE_PLATFORMS)) errors.push(error("platform", "invalid_platform", "platform is not supported."));
  if (!isString(input.mode)) errors.push(error("mode", "missing_mode", "mode is required."));
  if (!isString(input.status)) errors.push(error("status", "missing_status", "status is required."));
  if (!isRecord(input.source)) errors.push(error("source", "missing_source", "source object is required."));
  if (!isRecord(input.output)) errors.push(error("output", "missing_output", "output object is required."));
  if (!isRecord(input.counters)) {
    errors.push(error("counters", "missing_counters", "counters object is required."));
  } else {
    for (const field of [
      "commentsTotal",
      "questionsTotal",
      "audioIssuesTotal",
      "videoIssuesTotal",
      "dangerHeldTotal",
      "alertsTotal",
      "readAloudTotal",
    ]) {
      if (!isNumber(input.counters[field])) {
        errors.push(error(`counters.${field}`, "invalid_counter", `${field} must be a number.`));
      }
    }
  }

  return result(errors);
}

export function validateCommentLog(input: unknown): LogValidationResult {
  const errors: LogValidationError[] = [];
  if (!validateBase(input, errors)) return result(errors);

  if (!isString(input.commentId)) errors.push(error("commentId", "missing_comment_id", "commentId is required."));
  if (!isString(input.timestamp)) errors.push(error("timestamp", "missing_timestamp", "timestamp is required."));
  if (!isOneOf(input.platform, SMARTLIVE_PLATFORMS)) errors.push(error("platform", "invalid_platform", "platform is not supported."));
  if (!isString(input.sourceType)) errors.push(error("sourceType", "missing_source_type", "sourceType is required."));
  if (!isRecord(input.user)) {
    errors.push(error("user", "missing_user", "user object is required."));
  } else if (!isString(input.user.displayName)) {
    errors.push(error("user.displayName", "missing_display_name", "user.displayName is required."));
  }
  if (!isString(input.text)) errors.push(error("text", "missing_text", "text is required."));
  if (!Array.isArray(input.labels) || input.labels.length === 0) {
    errors.push(error("labels", "missing_labels", "labels must be a non-empty array."));
  } else {
    input.labels.forEach((label, index) => {
      if (!isOneOf(label, COMMENT_LABELS)) errors.push(error(`labels.${index}`, "invalid_label", "label is not supported."));
    });
  }
  if (!isNumber(input.score) || input.score < 0 || input.score > 100) {
    errors.push(error("score", "invalid_score", "score must be a number from 0 to 100."));
  }
  if (!isOneOf(input.priority, COMMENT_PRIORITIES)) {
    errors.push(error("priority", "invalid_priority", "priority is not supported."));
  }
  if (!isRecord(input.readAloud)) {
    errors.push(error("readAloud", "missing_read_aloud", "readAloud object is required."));
  } else {
    for (const field of ["allowed", "queued", "read", "held"]) {
      if (!isBoolean(input.readAloud[field])) {
        errors.push(error(`readAloud.${field}`, "invalid_boolean", `${field} must be boolean.`));
      }
    }
  }
  if (!isRecord(input.moderation)) {
    errors.push(error("moderation", "missing_moderation", "moderation object is required."));
  }
  if (!isBoolean(input.handled)) errors.push(error("handled", "invalid_boolean", "handled must be boolean."));
  if (!isBoolean(input.pinned)) errors.push(error("pinned", "invalid_boolean", "pinned must be boolean."));

  return result(errors);
}

export function validateAlertLog(input: unknown): LogValidationResult {
  const errors: LogValidationError[] = [];
  if (!validateBase(input, errors)) return result(errors);

  if (!isString(input.alertId)) errors.push(error("alertId", "missing_alert_id", "alertId is required."));
  if (!isString(input.timestamp)) errors.push(error("timestamp", "missing_timestamp", "timestamp is required."));
  if (!isOneOf(input.type, ALERT_TYPES)) errors.push(error("type", "invalid_alert_type", "type is not supported."));
  if (!isOneOf(input.severity, ALERT_SEVERITIES)) errors.push(error("severity", "invalid_severity", "severity is not supported."));
  if (!isOneOf(input.source, ALERT_SOURCES)) errors.push(error("source", "invalid_source", "source is not supported."));
  if (!isString(input.title)) errors.push(error("title", "missing_title", "title is required."));
  if (!isString(input.message)) errors.push(error("message", "missing_message", "message is required."));
  if (!isBoolean(input.acknowledged)) errors.push(error("acknowledged", "invalid_boolean", "acknowledged must be boolean."));
  if (!isBoolean(input.resolved)) errors.push(error("resolved", "invalid_boolean", "resolved must be boolean."));

  return result(errors);
}

export function validateStreamStateLog(input: unknown): LogValidationResult {
  const errors: LogValidationError[] = [];
  if (!validateBase(input, errors)) return result(errors);

  if (!isString(input.stateId)) errors.push(error("stateId", "missing_state_id", "stateId is required."));
  if (!isString(input.timestamp)) errors.push(error("timestamp", "missing_timestamp", "timestamp is required."));
  if (!isBoolean(input.live)) errors.push(error("live", "invalid_boolean", "live must be boolean."));
  if (!isRecord(input.metrics)) errors.push(error("metrics", "missing_metrics", "metrics object is required."));

  return result(errors);
}

export function validateReportLog(input: unknown): LogValidationResult {
  const errors: LogValidationError[] = [];
  if (!validateBase(input, errors)) return result(errors);

  if (!isString(input.reportId)) errors.push(error("reportId", "missing_report_id", "reportId is required."));
  if (!isString(input.createdAt)) errors.push(error("createdAt", "missing_created_at", "createdAt is required."));
  if (!isRecord(input.summary)) errors.push(error("summary", "missing_summary", "summary object is required."));
  if (!isRecord(input.counts)) errors.push(error("counts", "missing_counts", "counts object is required."));
  if (!Array.isArray(input.highlights)) errors.push(error("highlights", "invalid_highlights", "highlights must be an array."));
  if (!Array.isArray(input.issues)) errors.push(error("issues", "invalid_issues", "issues must be an array."));
  if (!Array.isArray(input.notes)) errors.push(error("notes", "invalid_notes", "notes must be an array."));

  return result(errors);
}
