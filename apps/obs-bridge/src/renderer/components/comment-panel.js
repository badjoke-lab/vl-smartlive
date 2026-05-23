import { labelDisplay, radarGroups } from "../comment-model.js";

function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function createBadge(label, urgent = false) {
  const badge = document.createElement("span");
  badge.className = `badge ${urgent ? "urgent" : ""}`;
  badge.textContent = labelDisplay[label] ?? label;
  return badge;
}

function createActionButton(label, action, id) {
  const button = document.createElement("button");
  button.className = "mini-button";
  button.type = "button";
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

export function filterComments(comments, filter, search) {
  const query = search.trim().toLowerCase();

  return comments.filter((comment) => {
    const matchesSearch = !query ||
      comment.text.toLowerCase().includes(query) ||
      comment.user.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filter === "all") return true;
    if (filter === "urgent") return comment.priority === "urgent" || comment.held;
    if (filter === "held") return comment.held;
    if (filter === "handled") return comment.handled;
    return comment.labels.includes(filter);
  });
}

export function renderRawComments(container, comments) {
  clear(container);

  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No comments match the current filter.";
    container.appendChild(empty);
    return;
  }

  for (const comment of comments) {
    const item = document.createElement("article");
    item.className = `comment-item ${comment.pinned ? "pinned" : ""} ${comment.handled ? "handled" : ""}`;

    const meta = document.createElement("div");
    meta.className = "comment-meta";
    meta.textContent = `${comment.time} ${comment.user}`;

    const text = document.createElement("p");
    text.textContent = comment.text;

    const badges = document.createElement("div");
    badges.className = "badges";
    comment.labels.slice(0, 3).forEach((label) => badges.appendChild(createBadge(label, comment.priority === "urgent")));
    if (comment.held) badges.appendChild(createBadge("保留", true));
    if (comment.handled) badges.appendChild(createBadge("対応済み", false));
    if (comment.pinned) badges.appendChild(createBadge("固定", false));

    const actions = document.createElement("div");
    actions.className = "comment-actions";
    actions.appendChild(createActionButton(comment.held ? "Unhold" : "Hold", "toggle-held", comment.id));
    actions.appendChild(createActionButton(comment.handled ? "Undo" : "Handled", "toggle-handled", comment.id));
    actions.appendChild(createActionButton(comment.pinned ? "Unpin" : "Pin", "toggle-pinned", comment.id));

    item.append(meta, text, badges, actions);
    container.appendChild(item);
  }
}

export function renderRadarTabs(container, comments, activeGroup) {
  clear(container);

  for (const group of radarGroups) {
    const button = document.createElement("button");
    button.className = `radar-tab ${activeGroup === group.id ? "active" : ""}`;
    button.type = "button";
    button.dataset.radarGroup = group.id;
    const count = comments.filter(group.match).length;
    button.textContent = `${group.label} (${count})`;
    container.appendChild(button);
  }
}

export function renderRadarComments(container, comments, activeGroup) {
  clear(container);

  const selectedGroup = radarGroups.find((group) => group.id === activeGroup) ?? radarGroups[0];
  const items = comments.filter(selectedGroup.match);

  const group = document.createElement("section");
  group.className = "radar-group";

  const title = document.createElement("h3");
  title.textContent = `${selectedGroup.label} (${items.length})`;
  group.appendChild(title);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No comments.";
    group.appendChild(empty);
  } else {
    for (const comment of items) {
      const row = document.createElement("div");
      row.className = "radar-row";
      row.textContent = `${comment.time} ${comment.user}: ${comment.text}`;
      group.appendChild(row);
    }
  }

  container.appendChild(group);
}
