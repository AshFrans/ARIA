// Integration registry — add new integrations here, zero core code changes required.
// Each integration exports: { name, description, functionDeclarations }
// Each createXHandlers(config) returns a { functionName: asyncHandler } map.

import { clockifyIntegration, createClockifyHandlers } from './clockify';
import { todosIntegration, createTodosHandlers } from './todos';
import { notesIntegration, createNotesHandlers } from './notes';

export const INTEGRATIONS = [clockifyIntegration, todosIntegration, notesIntegration];

// Build the handler map for a session given current settings and active tab.
// activeTab: 'Work' | 'Personal'
// settings: all values from storage
export function buildHandlers({ settings, activeTab }) {
  const handlers = {};

  // GitHub config scoped to active tab
  const githubConfig =
    activeTab === 'Work'
      ? {
          token: settings.work_github_token,
          owner: settings.work_github_owner,
          repo: settings.work_github_repo,
        }
      : {
          token: settings.personal_github_token,
          owner: settings.personal_github_owner,
          repo: settings.personal_github_repo,
        };

  const hasGitHub = githubConfig.token && githubConfig.owner && githubConfig.repo;

  // Clockify — Work tab only
  if (activeTab === 'Work' && settings.clockify_api_key && settings.integrations_clockify !== false) {
    Object.assign(handlers, createClockifyHandlers(settings.clockify_api_key));
  }

  // Todos — both tabs (scoped via githubConfig)
  if (hasGitHub && settings.integrations_todos !== false) {
    Object.assign(handlers, createTodosHandlers(githubConfig));
  }

  // Notes — both tabs (scoped via githubConfig)
  if (hasGitHub && settings.integrations_notes !== false) {
    Object.assign(handlers, createNotesHandlers(githubConfig));
  }

  return handlers;
}

// Return enabled tools in OpenAI format: [{ type: 'function', function: { name, description, parameters } }]
export function getEnabledDeclarations({ settings, activeTab }) {
  const declarations = [];

  if (activeTab === 'Work' && settings.clockify_api_key && settings.integrations_clockify !== false) {
    declarations.push(...clockifyIntegration.functionDeclarations);
  }

  const hasGitHub =
    activeTab === 'Work'
      ? settings.work_github_token && settings.work_github_owner && settings.work_github_repo
      : settings.personal_github_token && settings.personal_github_owner && settings.personal_github_repo;

  if (hasGitHub) {
    if (settings.integrations_todos !== false) {
      declarations.push(...todosIntegration.functionDeclarations);
    }
    if (settings.integrations_notes !== false) {
      declarations.push(...notesIntegration.functionDeclarations);
    }
  }

  // Wrap in OpenAI tool format
  return declarations.map(d => ({ type: 'function', function: d }));
}
